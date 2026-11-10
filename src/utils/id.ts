/** RFC4122 v4 id; falls back when randomUUID is unavailable (non-secure origins over plain http). */
export function newId(): string {
  const c: Crypto = globalThis.crypto
  if (typeof c.randomUUID === 'function') return c.randomUUID()
  const b = c.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export function stamp<T extends object>(data: T, sample = false) {
  const now = new Date().toISOString()
  return { ...data, id: newId(), createdAt: now, updatedAt: now, ...(sample ? { isSample: true } : {}) }
}
