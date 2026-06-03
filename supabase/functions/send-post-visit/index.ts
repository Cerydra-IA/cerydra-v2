import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAKE_WEBHOOK_URL = Deno.env.get('MAKE_POST_VISIT_WEBHOOK_URL')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? ''
  if (auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const now = new Date()
    // Fenêtre : réservations dont la date est entre -25h et -23h (24h après la visite)
    const from24h = new Date(now.getTime() - 25 * 60 * 60 * 1000)
    const to24h   = new Date(now.getTime() - 23 * 60 * 60 * 1000)

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('id, prenom, nom, email, date, heure, nb_personnes, restaurants(nom, slug)')
      .eq('post_visit_sent', false)
      .eq('statut', 'confirmée')
      .gte('date', from24h.toISOString().split('T')[0])
      .lte('date', to24h.toISOString().split('T')[0])

    if (error) throw error
    if (!reservations || reservations.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'Aucun email post-visite à envoyer' }), { status: 200 })
    }

    let sent = 0
    const errors: string[] = []

    for (const resa of reservations) {
      // Filtre précis sur heure pour rester dans la fenêtre [-25h, -23h]
      const resaDatetime = new Date(`${resa.date}T${resa.heure}:00`)
      if (resaDatetime > to24h || resaDatetime < from24h) continue

      const restaurant = Array.isArray(resa.restaurants) ? resa.restaurants[0] : resa.restaurants

      try {
        const webhookRes = await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id:           resa.id,
            prenom:       resa.prenom,
            nom:          resa.nom,
            email:        resa.email,
            date:         resa.date,
            heure:        resa.heure,
            nb_personnes: resa.nb_personnes,
            restaurant:   restaurant?.nom ?? '',
            slug:         restaurant?.slug ?? '',
          }),
        })

        if (!webhookRes.ok) {
          throw new Error(`Make webhook ${webhookRes.status}: ${await webhookRes.text()}`)
        }

        const { error: updateError } = await supabase
          .from('reservations')
          .update({ post_visit_sent: true })
          .eq('id', resa.id)

        if (updateError) throw updateError
        sent++

      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[send-post-visit] Erreur réservation ${resa.id}:`, msg)
        errors.push(`${resa.id}: ${msg}`)
      }
    }

    return new Response(
      JSON.stringify({ sent, errors: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[send-post-visit] Erreur globale:', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
})
