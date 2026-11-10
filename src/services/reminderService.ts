import type { ReminderConfig } from '@/types/models'

/**
 * Connects this device to the reminder Worker (worker/index.ts).
 * Sent to the server: the browser's push address, the time zone, and reminder times. Nothing else.
 */
export type ReminderSupport = 'supported' | 'needs-install' | 'unsupported'

export function reminderSupport(): ReminderSupport {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    // iPhone only allows notifications for apps added to the Home Screen.
    return /iphone|ipad/i.test(navigator.userAgent) ? 'needs-install' : 'unsupported'
  }
  if (!('PushManager' in window)) return 'unsupported'
  return 'supported'
}

export const permission = () => ('Notification' in window ? Notification.permission : 'denied')

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new Error('No internet connection. Reminders need to be online to switch on or change.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'The reminder service did not respond. Try again in a minute.')
  return data as T
}

function keyToBytes(b64: string) {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

async function registration() {
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) throw new Error('Open Daily360 from the installed app icon once, then try again.')
  return navigator.serviceWorker.ready
}

/** Asks for permission (if needed), subscribes, and registers the schedule. Returns the push endpoint. */
export async function enableReminders(config: ReminderConfig): Promise<string> {
  if (reminderSupport() !== 'supported') throw new Error('This browser cannot show reminders.')
  const result = await Notification.requestPermission()
  if (result !== 'granted') throw new Error('Notifications are blocked. Allow them for Daily360 in your phone settings, then try again.')

  const reg = await registration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    const res = await fetch('/api/push/public-key').catch(() => null)
    if (!res?.ok) throw new Error('The reminder service is not reachable. Check your internet connection.')
    const { key } = (await res.json()) as { key: string }
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) })
  }
  await post('/api/push/subscribe', { endpoint: sub.endpoint, timeZone: timeZone(), config })
  return sub.endpoint
}

/** Sends updated times for an already-enabled device. */
export async function syncReminders(endpoint: string, config: ReminderConfig) {
  await post('/api/push/subscribe', { endpoint, timeZone: timeZone(), config })
}

export async function disableReminders(endpoint?: string) {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  const ep = endpoint ?? sub?.endpoint
  if (ep) await post('/api/push/unsubscribe', { endpoint: ep }).catch(() => null)
  await sub?.unsubscribe()
}

export async function sendTestReminder(endpoint: string) {
  const { result } = await post<{ result: string }>('/api/push/test', { endpoint })
  if (result === 'unknown') throw new Error('This phone is not registered any more. Switch reminders off and on again.')
  if (result !== 'sent') throw new Error('The push service rejected the test. Try again in a minute.')
}
