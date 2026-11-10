/* Daily360 reminder handling inside the service worker.
 * Loaded by the generated Workbox service worker via importScripts.
 * Pushes carry no payload: the worker asks /api/push/pending which reminder it was.
 * Reads and writes only this device's local Daily360 database. */

const COPY = {
  water: {
    title: (name) => (name ? `Hey ${name}, did you drink water?` : 'Did you drink water?'),
    image: '/reminders/water-card.png',
    actions: [{ action: 'yes', title: 'YES' }, { action: 'later', title: 'Remind me later' }],
  },
  sleep: {
    title: (name) => (name ? `It's time to sleep, ${name}` : "It's time to sleep"),
    image: '/reminders/sleep-card.png',
    actions: [{ action: 'night', title: 'Good night' }, { action: 'later', title: '15 more minutes' }],
  },
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('daily360')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
const done = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error) })

async function readContext() {
  try {
    const db = await openDb()
    if (!db.objectStoreNames.contains('app_settings')) { db.close(); return {} }
    const tx = db.transaction(['app_settings', 'wellness_logs'], 'readonly')
    const settings = await done(tx.objectStore('app_settings').get('app'))
    const log = await done(tx.objectStore('wellness_logs').index('date').get(todayKey()))
    db.close()
    return { name: settings?.displayName || '', water: log?.waterMl || 0, target: settings?.targets?.waterMl || 2500 }
  } catch { return {} }
}

/** Adds water directly to today's wellness log (used when no app window is open). */
async function addWater(ml) {
  const db = await openDb()
  const tx = db.transaction('wellness_logs', 'readwrite')
  const store = tx.objectStore('wellness_logs')
  const date = todayKey()
  const now = new Date().toISOString()
  const existing = await done(store.index('date').get(date))
  const total = (existing?.waterMl || 0) + ml
  if (existing) await done(store.put({ ...existing, waterMl: total, isSample: undefined, updatedAt: now }))
  else await done(store.add({ id: crypto.randomUUID(), createdAt: now, updatedAt: now, date, waterMl: total }))
  await new Promise((r) => { tx.oncomplete = r; tx.onerror = r })
  db.close()
  return total
}

async function api(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.ok ? res.json() : null
}

async function endpoint() {
  const sub = await self.registration.pushManager.getSubscription()
  return sub ? sub.endpoint : null
}

async function appWindows() {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
}

async function handlePush() {
  const ep = await endpoint()
  let kind = null
  try { kind = ep ? (await api('/api/push/pending', { endpoint: ep }))?.kind : null } catch { /* offline */ }
  if (kind !== 'water' && kind !== 'sleep') kind = new Date().getHours() >= 21 ? 'sleep' : 'water'

  // App is on screen: let it show the animated character instead of a system notification.
  const visible = (await appWindows()).find((c) => c.visibilityState === 'visible' && c.focused)
  if (visible) { visible.postMessage({ type: 'daily360-reminder', kind }); return }

  const ctx = await readContext()
  const copy = COPY[kind]
  const body = kind === 'water'
    ? `${((ctx.water || 0) / 1000).toFixed(2).replace(/0$/, '')} L of ${((ctx.target || 2500) / 1000).toFixed(1)} L so far today. Tap YES to log a glass.`
    : 'Good sleep makes tomorrow easier. Put the phone down soon.'

  await self.registration.showNotification(copy.title(ctx.name), {
    body,
    icon: '/pwa-192.png',
    badge: '/reminders/badge.png',
    image: copy.image,
    tag: `daily360-${kind}`,
    renotify: true,
    vibrate: [120, 60, 120],
    actions: copy.actions,
    data: { kind },
  })
}

self.addEventListener('push', (event) => event.waitUntil(handlePush()))

self.addEventListener('notificationclick', (event) => {
  const { kind } = event.notification.data || {}
  event.notification.close()
  event.waitUntil((async () => {
    const windows = await appWindows()
    if (event.action === 'yes') {
      // An open app window writes through its own database layer so screens update instantly.
      if (windows.length) windows[0].postMessage({ type: 'daily360-add-water', ml: 250 })
      else {
        const total = await addWater(250)
        await self.registration.showNotification('Logged 250 ml 💧', {
          body: `${(total / 1000).toFixed(2).replace(/0$/, '')} L today. Nice work.`,
          icon: '/pwa-192.png', badge: '/reminders/badge.png', tag: 'daily360-water', silent: true,
        })
      }
      return
    }
    if (event.action === 'later') {
      const ep = await endpoint()
      if (ep) await api('/api/push/snooze', { endpoint: ep, kind, minutes: 15 }).catch(() => null)
      return
    }
    if (event.action === 'night') return
    // Tapped the notification itself: open the app with the animated reminder.
    const url = `/?reminder=${kind || 'water'}`
    const win = windows[0]
    if (win) { await win.focus(); win.postMessage({ type: 'daily360-reminder', kind }) }
    else await self.clients.openWindow(url)
  })())
})
