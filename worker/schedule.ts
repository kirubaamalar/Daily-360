/**
 * Reminder schedule rules. Pure functions, shared by the Worker and the tests.
 * All times are local to the user's time zone and snapped to 15-minute slots,
 * because the cron trigger runs every 15 minutes.
 */
export type ReminderKind = 'water' | 'sleep'

export interface ReminderConfig {
  water: { enabled: boolean; start: string; end: string; everyMinutes: number }
  sleep: { enabled: boolean; time: string }
}

export const DEFAULT_REMINDERS: ReminderConfig = {
  water: { enabled: true, start: '10:00', end: '18:00', everyMinutes: 60 },
  sleep: { enabled: true, time: '23:30' },
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/

/** "10:30" → 630. Invalid input → null. */
export function toMinutes(hhmm: string): number | null {
  const m = HHMM.exec(hhmm)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

export const snap15 = (minutes: number) => Math.floor(minutes / 15) * 15

/** Validates and normalises a config received from a client. */
export function sanitiseConfig(input: unknown): ReminderConfig | null {
  if (!input || typeof input !== 'object') return null
  const c = input as Partial<ReminderConfig>
  const start = toMinutes(String(c.water?.start ?? ''))
  const end = toMinutes(String(c.water?.end ?? ''))
  const sleep = toMinutes(String(c.sleep?.time ?? ''))
  const every = Number(c.water?.everyMinutes)
  if (start === null || end === null || sleep === null) return null
  if (end < start) return null
  if (![30, 45, 60, 90, 120, 180].includes(every)) return null
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  return {
    water: { enabled: !!c.water?.enabled, start: fmt(snap15(start)), end: fmt(snap15(end)), everyMinutes: every },
    sleep: { enabled: !!c.sleep?.enabled, time: fmt(snap15(sleep)) },
  }
}

/** Reminders due in the 15-minute slot that contains `localMinutes`. */
export function dueReminders(cfg: ReminderConfig, localMinutes: number): ReminderKind[] {
  const slot = snap15(localMinutes)
  const due: ReminderKind[] = []
  if (cfg.water.enabled) {
    const start = toMinutes(cfg.water.start)!
    const end = toMinutes(cfg.water.end)!
    if (slot >= start && slot <= end && (slot - start) % cfg.water.everyMinutes === 0) due.push('water')
  }
  if (cfg.sleep.enabled && slot === toMinutes(cfg.sleep.time)) due.push('sleep')
  return due
}

/** Local wall-clock minutes and date for an instant in an IANA time zone. */
export function localTime(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0'
  return {
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
    date: `${get('year')}-${get('month')}-${get('day')}`,
  }
}

export function isValidTimeZone(tz: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true } catch { return false }
}
