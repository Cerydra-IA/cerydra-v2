import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function base64urlToBytes(str: string): Uint8Array {
  const pad = '='.repeat((4 - (str.length % 4)) % 4)
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

function bytesToBase64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) { out.set(a, offset); offset += a.length }
  return out
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  return hmac(salt, ikm)
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const t1 = await hmac(prk, concat(info, new Uint8Array([1])))
  return t1.slice(0, length)
}

// RFC 8291 encryption
async function encryptPayload(plaintext: string, p256dhB64: string, authB64: string): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const plaintextBytes = enc.encode(plaintext)

  const uaPublicBytes = base64urlToBytes(p256dhB64)
  const clientPublicKey = await crypto.subtle.importKey(
    'raw', uaPublicBytes, { name: 'ECDH', namedCurve: 'P-256' }, true, []
  )

  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  )
  const asPublicBytes = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeyPair.publicKey))

  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPublicKey }, serverKeyPair.privateKey, 256)
  )

  const authSecret = base64urlToBytes(authB64)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // RFC 8291 Section 3.1: PRK_combine + IKM
  const prkCombine = await hkdfExtract(authSecret, ecdhSecret)
  const keyInfo = concat(enc.encode('WebPush: info'), new Uint8Array([0]), uaPublicBytes, asPublicBytes)
  const ikm = await hkdfExpand(prkCombine, keyInfo, 32)

  // RFC 8291 Section 3.2: CEK + nonce
  const prk = await hkdfExtract(salt, ikm)
  const cek = await hkdfExpand(prk, concat(enc.encode('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16)
  const nonce = await hkdfExpand(prk, concat(enc.encode('Content-Encoding: nonce'), new Uint8Array([0])), 12)

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])

  const padded = new Uint8Array(plaintextBytes.length + 1)
  padded.set(plaintextBytes)
  padded[plaintextBytes.length] = 2

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded)
  )

  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096, false)
  return concat(salt, rs, new Uint8Array([asPublicBytes.length]), asPublicBytes, ciphertext)
}

async function makeVapidJWT(privateKeyB64url: string, publicKeyB64url: string, audience: string, subject: string): Promise<string> {
  const enc = new TextEncoder()
  const header = bytesToBase64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = bytesToBase64url(enc.encode(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 43200, sub: subject })))
  const signingInput = `${header}.${payload}`
  const privateBytes = base64urlToBytes(privateKeyB64url)
  const publicBytes = base64urlToBytes(publicKeyB64url)
  const x = bytesToBase64url(publicBytes.slice(1, 33))
  const y = bytesToBase64url(publicBytes.slice(33, 65))
  const d = bytesToBase64url(privateBytes)
  const cryptoKey = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x, y, d }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, enc.encode(signingInput))
  return `vapid t=${signingInput}.${bytesToBase64url(new Uint8Array(sig))},k=${publicKeyB64url}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } })
  try {
    const body = await req.json()
    const record = body.record || body

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('restaurant_id', record.restaurant_id)

    if (!subs || subs.length === 0) return new Response(JSON.stringify({ sent: 0 }), { status: 200 })

    const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
    const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@cerydra.fr'

    const date = new Date(record.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    const heure = record.heure ? record.heure.slice(0, 5) : ''
    const notifBody = `${record.prenom} ${record.nom} - ${date} a ${heure} - ${record.nb_personnes} pers.`
    const payload = JSON.stringify({ body: notifBody, id: record.id })

    let sent = 0
    for (const sub of subs) {
      try {
        const vapidAuth = await makeVapidJWT(VAPID_PRIVATE, VAPID_PUBLIC, new URL(sub.endpoint).origin, VAPID_SUBJECT)
        const encrypted = await encryptPayload(payload, sub.p256dh, sub.auth)
        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: new Headers({
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'Authorization': vapidAuth,
            'TTL': '86400',
          }),
          body: encrypted,
        })
        console.log('push status:', res.status)
        if (res.ok || res.status === 201) sent++
        else if (res.status === 410) await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      } catch (e) { console.error('Push error', e) }
    }

    return new Response(JSON.stringify({ sent }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
