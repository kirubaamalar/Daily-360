import { describe, expect, it } from 'vitest'
import { DEFAULT_REMINDERS, dueReminders, localTime, sanitiseConfig, toMinutes } from '../../worker/schedule'
import { generateVapidKeys, isPushEndpoint, vapidJwt } from '../../worker/webpush'

const at = (hhmm: string) => toMinutes(hhmm)!

describe('your scenario: water 10 AM–6 PM hourly, sleep 11:30 PM', () => {
  const cfg = DEFAULT_REMINDERS
  it('sends water exactly 9 times a day, on the hour', () => {
    const times: string[] = []
    for (let m = 0; m < 24 * 60; m += 15) if (dueReminders(cfg, m).includes('water')) times.push(`${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`)
    expect(times).toEqual(['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'])
  })
  it('sends sleep only at 23:30', () => {
    const times = Array.from({ length: 96 }, (_, i) => i * 15).filter((m) => dueReminders(cfg, m).includes('sleep'))
    expect(times).toEqual([at('23:30')])
  })
  it('tolerates a cron that fires a few minutes late', () => {
    expect(dueReminders(cfg, at('11:03'))).toEqual(['water'])
    expect(dueReminders(cfg, at('11:16'))).toEqual([])
  })
  it('converts UTC cron time to India time', () => {
    // 04:30 UTC = 10:00 IST, 18:00 UTC = 23:30 IST
    expect(localTime(new Date('2026-11-10T04:30:00Z'), 'Asia/Kolkata').minutes).toBe(at('10:00'))
    const late = localTime(new Date('2026-11-10T18:00:00Z'), 'Asia/Kolkata')
    expect(late).toEqual({ minutes: at('23:30'), date: '2026-11-10' })
  })
})

describe('config validation', () => {
  it('rejects bad input and snaps to 15 minutes', () => {
    expect(sanitiseConfig({ water: { enabled: true, start: '18:00', end: '10:00', everyMinutes: 60 }, sleep: { enabled: true, time: '23:30' } })).toBeNull()
    expect(sanitiseConfig({ water: { enabled: true, start: '10:00', end: '18:00', everyMinutes: 7 }, sleep: { enabled: true, time: '23:30' } })).toBeNull()
    expect(sanitiseConfig({ water: { enabled: true, start: '10:07', end: '18:00', everyMinutes: 60 }, sleep: { enabled: false, time: '23:40' } }))
      .toEqual({ water: { enabled: true, start: '10:00', end: '18:00', everyMinutes: 60 }, sleep: { enabled: false, time: '23:30' } })
  })
  it('accepts only real push services', () => {
    expect(isPushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true)
    expect(isPushEndpoint('https://evil.example.com/x')).toBe(false)
    expect(isPushEndpoint('http://fcm.googleapis.com/x')).toBe(false)
  })
})

describe('VAPID', () => {
  it('produces an ES256 JWT that verifies with the public key', async () => {
    const keys = await generateVapidKeys()
    const jwt = await vapidJwt('https://fcm.googleapis.com/fcm/send/abc', 'https://example.org', keys, 1_700_000_000_000)
    const [h, p, s] = jwt.split('.')
    const dec = (x: string) => Uint8Array.from(atob(x.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((x.length + 3) % 4)), (c) => c.charCodeAt(0))
    expect(JSON.parse(new TextDecoder().decode(dec(p)))).toMatchObject({ aud: 'https://fcm.googleapis.com', sub: 'https://example.org' })
    const pub = await crypto.subtle.importKey('raw', dec(keys.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, dec(s), new TextEncoder().encode(`${h}.${p}`))
    expect(ok).toBe(true)
    expect(dec(keys.publicKey).length).toBe(65)
  })
})
