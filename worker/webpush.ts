/**
 * Minimal Web Push sender (RFC 8292 VAPID) using only WebCrypto.
 * Pushes are sent without a payload; the service worker asks the Worker which
 * reminder it was, so no message encryption is required.
 */
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)))

export interface VapidKeys {
  publicKey: string // base64url raw P-256 point, used as applicationServerKey
  privateJwk: JsonWebKey
}

export async function generateVapidKeys(): Promise<VapidKeys> {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
  const raw = (await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer
  const privateJwk = (await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey
  return { publicKey: b64url(raw), privateJwk }
}

export async function vapidJwt(endpoint: string, subject: string, keys: VapidKeys, now = Date.now()) {
  const key = await crypto.subtle.importKey('jwk', keys.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const unsigned = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({
    aud: new URL(endpoint).origin,
    exp: Math.floor(now / 1000) + 12 * 3600,
    sub: subject,
  })}`
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned))
  return `${unsigned}.${b64url(sig)}`
}

export type PushResult = 'sent' | 'gone' | 'failed'

export async function sendPush(endpoint: string, keys: VapidKeys, subject: string, opts: { ttl: number; topic: string }): Promise<PushResult> {
  const jwt = await vapidJwt(endpoint, subject, keys)
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${keys.publicKey}`,
      TTL: String(opts.ttl),
      Urgency: 'high',
      Topic: opts.topic,
      'Content-Length': '0',
    },
  })
  if (res.status === 404 || res.status === 410) return 'gone'
  return res.ok ? 'sent' : 'failed'
}

/** Only real browser push services are accepted as endpoints. */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /^push\.services\.mozilla\.com$/,
  /\.notify\.windows\.com$/, /^web\.push\.apple\.com$/, /\.push\.apple\.com$/]
export function isPushEndpoint(url: string) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && PUSH_HOSTS.some((r) => r.test(u.hostname))
  } catch { return false }
}

export async function endpointId(endpoint: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return b64url(h).slice(0, 32)
}
