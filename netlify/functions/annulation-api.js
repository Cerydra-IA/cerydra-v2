/**
 * Netlify Function — widget annulation
 * GET  /api/annulation?slug=xxx&email=xxx  → réservations à venir
 * POST /api/annulation                     → { token } → annule
 */

const SB_URL = process.env.VITE_SUPABASE_URL
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

async function sbRpc(fn, params) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  const url = new URL(req.url)

  try {
    // ── GET : cherche les réservations par email + slug ───────────
    if (req.method === 'GET') {
      const slug  = url.searchParams.get('slug')
      const email = url.searchParams.get('email')
      if (!slug || !email) {
        return new Response(JSON.stringify({ error: 'slug et email requis' }), { status: 400, headers })
      }
      const data = await sbRpc('chercher_reservations_annulation', { p_email: email, p_slug: slug })
      return new Response(JSON.stringify({ reservations: data || [] }), { status: 200, headers })
    }

    // ── POST : annule via token ────────────────────────────────────
    if (req.method === 'POST') {
      const { token } = await req.json()
      if (!token) {
        return new Response(JSON.stringify({ error: 'token manquant' }), { status: 400, headers })
      }
      const data = await sbRpc('annuler_reservation', { p_token: token })
      return new Response(JSON.stringify(data), { status: 200, headers })
    }

    return new Response(JSON.stringify({ error: 'Méthode non supportée' }), { status: 405, headers })

  } catch (err) {
    console.error('[annulation-api]', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
}

export const config = { path: '/api/annulation' }
