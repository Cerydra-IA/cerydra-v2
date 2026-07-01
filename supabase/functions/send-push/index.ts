import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── VAPID helpers (Web Crypto API natif Deno) ──────────────────────────────

function base64urlToBytes(str: string): Uint8Array {
  const pad = '='.repeat((4 - (str.length % 4)) % 4)
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

function bytesToBase64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function makeVapidJWT(
  privateKeyB64url: string,
  publicKeyB64url: string,
  audience: string,
  subject: string,
): Promise<{ auth: string; publicKey: string }> {
  const header = bytesToBase64url(
    new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  )
  const payload = bytesToBase64url(
    new TextEncoder().encode(JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 43200,
      sub: subject,
    }))
  )

  const signingInput = `${header}.${payload}`

  // Import EC private key — VAPID private key is raw 32-byte scalar, convert to JWK
  const privateBytes = base64urlToBytes(privateKeyB64url)
  const publicBytes  = base64urlToBytes(publicKeyB64url)

  // Public key is uncompressed: 0x04 || x(32) || y(32)
  const x = bytesToBase64url(publicBytes.slice(1, 33))
  const y = bytesToBase64url(publicBytes.slice(33, 65))
  const d = bytesToBase64url(privateBytes)

  const jwk = { kty: 'EC', crv: 'P-256', x, y, d }
  const cryptoKey = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput),
  )

  const jwt = `${signingInput}.${bytesToBase64url(new Uint8Array(sig))}`
  return { auth: `vapid t=${jwt},k=${publicKeyB64url}`, publicKey: publicKeyB64url }
}

// ── Envoi d'une notification push ─────────────────────────────────────────

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidAuth: string,
) {
  const url = new URL(sub.endpoint)
  const audience = `${url.protocol}//${url.host}`

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      Authorization: vapidAuth,
      TTL: '86400',
    },
    body: await encryptPayload(payload, sub.p256dh, sub.auth),
  })

  return res
}

// ── Chiffrement du payload (RFC 8291) ─────────────────────────────────────

async function encryptPayload(
  plaintext: string,
  p256dhB64: string,
  authB64: string,
): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const plaintextBytes = encoder.encode(plaintext)

  // Client public key (receiver)
  const clientPublicKey = await crypto.subtle.importKey(
    'raw', base64urlToBytes(p256dhB64),
    { name: 'ECDH', namedCurve: 'P-256' },
    true, []
  )

  // Server ephemeral key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, ['deriveKey', 'deriveBits']
  )

  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  )

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey },
      serverKeyPair.privateKey,
      256
    )
  )

  const authBytes = base64urlToBytes(authB64)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // HKDF-Extract + Expand (pseudo-random key)
  async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array) {
    const key = await crypto.subtle.importKey('raw', salt, 'HKDF', false, ['deriveKey'])
    return crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new Uint8Array() },
      key, { name: 'HMAC', hash: 'SHA-256', length: 256 }, true, ['sign']
    )
  }

  async function hkdfExpand(prk: CryptoKey, info: Uint8Array, length: number) {
    const raw = await crypto.subtle.exportKey('raw', prk)
    const baseKey = await crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveBits'])
    return crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info },
      baseKey, length * 8
    )
  }

  // auth_info
  const authInfo = encoder.encode('Content-Encoding: auth\0')
  const prkKey = await crypto.subtle.importKey(
    'raw', sharedSecret, { name: 'HKDF', hash: 'SHA-256' }, false, ['deriveBits']
  )
  const prk = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authBytes, info: authInfo },
    prkKey, 256
  ))

  // key_info & nonce_info
  const keyInfo   = concat(encoder.encode('Content-Encoding: aes128gcm\0\1'), serverPublicKeyRaw, base64urlToBytes(p256dhB64))
  const nonceInfo = concat(encoder.encode('Content-Encoding: nonce\0\1'), serverPublicKeyRaw, base64urlToBytes(p256dhB64))

  const prkFinal = await crypto.subtle.importKey(
    'raw', prk, { name: 'HKDF', hash: 'SHA-256' }, false, ['deriveBits']
  )

  const [keyBits, nonceBits] = await Promise.all([
    crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo }, prkFinal, 128),
    crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, prkFinal, 96),
  ])

  const aesKey = await crypto.subtle.importKey('raw', keyBits, 'AES-GCM', false, ['encrypt'])
  const nonce  = new Uint8Array(nonceBits)

  // Pad plaintext + delimiter
  const padded = new Uint8Array(plaintextBytes.length + 2)
  padded.set(plaintextBytes)
  padded[plaintextBytes.length] = 2 // delimiter

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded)
  )

  // Build RFC 8291 header: salt(16) + rs(4) + keyid_len(1) + keyid(65)
  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096, false)
  const header = concat(salt, rs, new Uint8Array([serverPublicKeyRaw.length]), serverPublicKeyRaw)

  return concat(header, ciphertext)
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) { out.set(a, offset); offset += a.length }
  return out
}

// ── Handler principal ──────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const body = await req.json()
    // Webhook Supabase : body.record = la nouvelle réservation
    const record = body.record || body

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Récupère toutes les subscriptions pour ce restaurant
    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('restaurant_id', record.restaurant_id)

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
    const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@cerydra.fr'

    // Formate la notification
    const date = new Date(record.date + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'short',
    })
    const heure = record.heure?.slice(0, 5) || ''
    const notifBody = `${record.prenom} ${record.nom} — ${date} à ${heure} · ${record.nb_personnes} pers.`

    const payload = JSON.stringify({ body: notifBody, id: record.id })

    let sent = 0
    for (const sub of subs) {
      try {
        // VAPID JWT par endpoint (audience = origin du endpoint)
        const origin = new URL(sub.endpoint).origin
        const { auth: vapidAuth } = await makeVapidJWT(
          VAPID_PRIVATE, VAPID_PUBLIC, origin, VAPID_SUBJECT
        )
        const res = await sendPush(sub, payload, vapidAuth)
        if (res.ok || res.status === 201) sent++
        else if (res.status === 410) {
          // Subscription expirée → supprimer
          await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      } catch (e) {
        console.error('Push error for', sub.endpoint, e)
      }
    }

    return new Response(JSON.stringify({ sent }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
