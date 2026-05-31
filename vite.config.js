import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Plugin qui émule les Netlify Functions en dev (/api/*)
function devApiPlugin(env) {
  const SB_URL = env.VITE_SUPABASE_URL
  const SB_KEY = env.VITE_SUPABASE_ANON_KEY

  async function sbGet(table, params) {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    })
    return res.json()
  }

  async function sbRpc(fn, params) {
    const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    return res.json()
  }

  async function sbPost(table, body) {
    const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await res.text())
    return true
  }

  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')

        // ── GET /api/widget?slug=xxx ──────────────────────────────
        if (req.method === 'GET' && url.pathname === '/api/widget') {
          const slug = url.searchParams.get('slug')
          try {
            const restos = await sbGet('restaurants', `slug=eq.${slug}&select=*`)
            if (!restos?.length) { res.writeHead(404); res.end(JSON.stringify({ error: 'Restaurant introuvable' })); return }
            const resto = restos[0]
            const horaires = await sbGet('horaires', `restaurant_id=eq.${resto.id}&select=*`)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ resto, horaires }))
          } catch (e) { res.writeHead(500); res.end(JSON.stringify({ error: e.message })) }
          return
        }

        // ── POST /api/widget?slug=xxx (réservation) ───────────────
        if (req.method === 'POST' && url.pathname === '/api/widget') {
          let body = ''
          req.on('data', d => body += d)
          req.on('end', async () => {
            try {
              const data = JSON.parse(body)
              const restos = await sbGet('restaurants', `slug=eq.${url.searchParams.get('slug')}&select=id`)
              await sbPost('reservations', { ...data, restaurant_id: restos[0].id, statut: 'en_attente' })
              res.writeHead(201, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: true }))
            } catch (e) { res.writeHead(500); res.end(JSON.stringify({ error: e.message })) }
          })
          return
        }

        // ── GET /api/annulation?slug=xxx&email=xxx ────────────────
        if (req.method === 'GET' && url.pathname === '/api/annulation') {
          const slug  = url.searchParams.get('slug')
          const email = url.searchParams.get('email')
          try {
            const data = await sbRpc('chercher_reservations_annulation', { p_email: email, p_slug: slug })
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ reservations: data || [] }))
          } catch (e) { res.writeHead(500); res.end(JSON.stringify({ error: e.message })) }
          return
        }

        // ── POST /api/annulation (annuler via token) ──────────────
        if (req.method === 'POST' && url.pathname === '/api/annulation') {
          let body = ''
          req.on('data', d => body += d)
          req.on('end', async () => {
            try {
              const { token } = JSON.parse(body)
              const data = await sbRpc('annuler_reservation', { p_token: token })
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(data))
            } catch (e) { res.writeHead(500); res.end(JSON.stringify({ error: e.message })) }
          })
          return
        }

        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), devApiPlugin(env)],
  }
})
