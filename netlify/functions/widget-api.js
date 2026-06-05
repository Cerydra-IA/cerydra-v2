/**
 * Netlify Function — proxy Supabase pour le widget
 * GET  /api/widget?slug=xxx          → infos restaurant + horaires
 * POST /api/widget?slug=xxx          → créer une réservation
 *
 * Les clés Supabase restent côté serveur, le widget ne les voit jamais.
 */

const SB_URL = process.env.VITE_SUPABASE_URL
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

async function sbGet(table, params) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function sbPost(table, body) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    let errCode = text
    try { errCode = JSON.parse(text).message || text } catch (_) {}
    throw new Error(errCode)
  }
  return true
}

export default async function handler(req) {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  const url = new URL(req.url)
  const slug = url.searchParams.get('slug')

  if (!slug) {
    return new Response(JSON.stringify({ error: 'slug manquant' }), { status: 400, headers })
  }

  try {
    // ── GET : récupère restaurant + horaires ──────────────────────
    if (req.method === 'GET') {
      const restos = await sbGet('restaurants', `slug=eq.${encodeURIComponent(slug)}&select=*`)
      if (!restos || restos.length === 0) {
        return new Response(JSON.stringify({ error: 'Restaurant introuvable' }), { status: 404, headers })
      }
      const resto = restos[0]
      const horaires = await sbGet('horaires', `restaurant_id=eq.${resto.id}&select=*`)
      return new Response(JSON.stringify({ resto, horaires }), { status: 200, headers })
    }

    // ── POST : crée une réservation ───────────────────────────────
    if (req.method === 'POST') {
      const body = await req.json()

      // FIX #4 : validation serveur
      if (!body.prenom || !body.nom) {
        return new Response(JSON.stringify({ error: 'Prénom et nom requis' }), { status: 422, headers })
      }
      if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        return new Response(JSON.stringify({ error: 'Email invalide' }), { status: 422, headers })
      }
      if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
        return new Response(JSON.stringify({ error: 'Date invalide' }), { status: 422, headers })
      }
      if (!body.heure || !/^\d{2}:\d{2}$/.test(body.heure)) {
        return new Response(JSON.stringify({ error: 'Heure invalide' }), { status: 422, headers })
      }
      if (!body.nb_personnes || isNaN(Number(body.nb_personnes)) || Number(body.nb_personnes) < 1) {
        return new Response(JSON.stringify({ error: 'Nombre de personnes invalide' }), { status: 422, headers })
      }

      // Vérifie que le restaurant_id correspond bien au slug
      const restos = await sbGet('restaurants', `slug=eq.${encodeURIComponent(slug)}&select=id`)
      if (!restos || restos.length === 0) {
        return new Response(JSON.stringify({ error: 'Restaurant introuvable' }), { status: 404, headers })
      }
      await sbPost('reservations', { ...body, restaurant_id: restos[0].id, statut: 'en_attente' })
      return new Response(JSON.stringify({ ok: true }), { status: 201, headers })
    }

    return new Response(JSON.stringify({ error: 'Méthode non supportée' }), { status: 405, headers })

  } catch (err) {
    const msg = err.message || ''
    if (msg === 'doublon_email' || msg === 'creneau_complet') {
      return new Response(JSON.stringify({ error: msg }), { status: 422, headers })
    }
    console.error('[widget-api]', err)
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers })
  }
}

export const config = { path: '/api/widget' }
