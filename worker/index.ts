/**
 * Daily360 reminder Worker.
 *
 * Serves the static app (assets) and a tiny /api/push API. A cron trigger runs every
 * 15 minutes and sends payload-free Web Push messages for due reminders.
 *
 * Stored per subscribed device: push endpoint, time zone, reminder times, snooze state.
 * No expenses, habits, wellness data, or names are ever sent here.
 */
import { DurableObject } from 'cloudflare:workers'
import { dueReminders, isValidTimeZone, localTime, sanitiseConfig, type ReminderConfig, type ReminderKind } from './schedule'
import { endpointId, generateVapidKeys, isPushEndpoint, sendPush, type VapidKeys } from './webpush'

export interface Env {
  ASSETS: Fetcher
  REMINDERS: DurableObjectNamespace<ReminderStore>
  VAPID_SUBJECT: string
}

interface Device {
  endpoint: string
  timeZone: string
  config: ReminderConfig
  snooze?: { kind: ReminderKind; at: number }
  lastKind?: ReminderKind
  lastSlot?: string
  createdAt: number
}

const MAX_DEVICES = 25
const TTL: Record<ReminderKind, number> = { water: 30 * 60, sleep: 60 * 60 }

export class ReminderStore extends DurableObject<Env> {
  private async keys(): Promise<VapidKeys> {
    let k = await this.ctx.storage.get<VapidKeys>('vapid')
    if (!k) {
      k = await generateVapidKeys()
      await this.ctx.storage.put('vapid', k)
    }
    return k
  }

  async publicKey() {
    return (await this.keys()).publicKey
  }

  async subscribe(endpoint: string, timeZone: string, config: ReminderConfig) {
    const id = `dev:${await endpointId(endpoint)}`
    const existing = await this.ctx.storage.get<Device>(id)
    if (!existing) {
      const count = (await this.ctx.storage.list({ prefix: 'dev:' })).size
      if (count >= MAX_DEVICES) throw new Error('Too many devices are registered.')
    }
    await this.ctx.storage.put<Device>(id, { ...existing, endpoint, timeZone, config, createdAt: existing?.createdAt ?? Date.now() })
  }

  async unsubscribe(endpoint: string) {
    await this.ctx.storage.delete(`dev:${await endpointId(endpoint)}`)
  }

  async snooze(endpoint: string, kind: ReminderKind, minutes: number) {
    const id = `dev:${await endpointId(endpoint)}`
    const d = await this.ctx.storage.get<Device>(id)
    if (!d) return false
    await this.ctx.storage.put<Device>(id, { ...d, snooze: { kind, at: Date.now() + minutes * 60_000 } })
    return true
  }

  async lastKind(endpoint: string): Promise<ReminderKind | null> {
    const d = await this.ctx.storage.get<Device>(`dev:${await endpointId(endpoint)}`)
    return d?.lastKind ?? null
  }

  async test(endpoint: string) {
    const id = `dev:${await endpointId(endpoint)}`
    const d = await this.ctx.storage.get<Device>(id)
    if (!d) return 'unknown'
    return this.deliver(id, d, 'water', undefined)
  }

  private async deliver(id: string, d: Device, kind: ReminderKind, slot: string | undefined) {
    // Record the kind first so the service worker can read it as soon as the push arrives.
    await this.ctx.storage.put<Device>(id, { ...d, lastKind: kind, lastSlot: slot ?? d.lastSlot })
    const result = await sendPush(d.endpoint, await this.keys(), this.env.VAPID_SUBJECT, { ttl: TTL[kind], topic: kind })
    if (result === 'gone') await this.ctx.storage.delete(id)
    return result
  }

  /** Called by the cron trigger. */
  async tick(nowMs: number) {
    const now = new Date(nowMs)
    const devices = await this.ctx.storage.list<Device>({ prefix: 'dev:' })
    const results: string[] = []
    for (const [id, d] of devices) {
      const { minutes, date } = localTime(now, d.timeZone)
      const slot = `${date}T${Math.floor(minutes / 15) * 15}`
      let kind: ReminderKind | undefined
      if (d.snooze && d.snooze.at <= nowMs + 60_000) {
        kind = d.snooze.kind
        d.snooze = undefined
      }
      if (!kind && d.lastSlot !== slot) {
        const due = dueReminders(d.config, minutes)
        kind = due.includes('sleep') ? 'sleep' : due[0]
      }
      if (kind) results.push(`${kind}:${await this.deliver(id, d, kind, slot)}`)
    }
    return results
  }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  if (Number(req.headers.get('Content-Length') ?? 0) > 4096) return null
  try {
    const text = await req.text()
    return text.length > 4096 ? null : (JSON.parse(text) as Record<string, unknown>)
  } catch { return null }
}

const store = (env: Env) => env.REMINDERS.get(env.REMINDERS.idFromName('global'))

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req)

    const s = store(env)
    if (url.pathname === '/api/push/public-key' && req.method === 'GET') return json({ key: await s.publicKey() })
    if (req.method !== 'POST') return json({ error: 'Not found' }, 404)

    const body = await readBody(req)
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : ''
    if (!body || !isPushEndpoint(endpoint)) return json({ error: 'Invalid request' }, 400)

    switch (url.pathname) {
      case '/api/push/subscribe': {
        const tz = String(body.timeZone ?? '')
        const config = sanitiseConfig(body.config)
        if (!isValidTimeZone(tz) || !config) return json({ error: 'Invalid reminder settings' }, 400)
        try { await s.subscribe(endpoint, tz, config) } catch (e) { return json({ error: (e as Error).message }, 429) }
        return json({ ok: true })
      }
      case '/api/push/unsubscribe':
        await s.unsubscribe(endpoint)
        return json({ ok: true })
      case '/api/push/snooze': {
        const kind = body.kind === 'sleep' ? 'sleep' : 'water'
        const minutes = Math.min(120, Math.max(5, Number(body.minutes) || 15))
        return json({ ok: await s.snooze(endpoint, kind, minutes) })
      }
      case '/api/push/pending':
        return json({ kind: await s.lastKind(endpoint) })
      case '/api/push/test':
        return json({ result: await s.test(endpoint) })
    }
    return json({ error: 'Not found' }, 404)
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(store(env).tick(Date.now()).then(() => undefined))
  },
} satisfies ExportedHandler<Env>
