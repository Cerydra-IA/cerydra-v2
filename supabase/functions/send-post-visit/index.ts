import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAKE_WEBHOOK_URL = Deno.env.get('MAKE_POST_VISIT_WEBHOOK_URL')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  try {
    const now      = new Date()
    // FIX #2 : fenêtre large sur la date, filtre précis côté JS sur datetime
    // Cherche toutes les réservations passées depuis plus de 24h (jusqu'à 48h pour rattraper)
    const before24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const before48h = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    const before24hStr = before24h.toISOString().split('T')[0]
    const before48hStr = before48h.toISOString().split('T')[0]

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('id, prenom, nom, email, date, heure, nb_personnes, restaurants(nom, slug)')
      .eq('post_visit_sent', false)
      .eq('statut', 'confirmée')
      .gte('date', before48hStr)
      .lte('date', before24hStr)

    if (error) throw error
    if (!reservations || reservations.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'Aucun email post-visite à envoyer' }), { status: 200 })
    }

    let sent = 0
    const errors: string[] = []

    for (const resa of reservations) {
      // Filtre précis : la réservation doit être entre -48h et -24h
      const resaDatetime = new Date(`${resa.date}T${resa.heure}:00`)
      if (resaDatetime >= before24h || resaDatetime < before48h) continue

      const restaurant = Array.isArray(resa.restaurants) ? resa.restaurants[0] : resa.restaurants

      try {
        // FIX #1 : marquer post_visit_sent = true AVANT le webhook
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ post_visit_sent: true })
          .eq('id', resa.id)

        if (updateError) throw updateError

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
          // Si le webhook échoue, on remet post_visit_sent = false pour réessayer
          await supabase.from('reservations').update({ post_visit_sent: false }).eq('id', resa.id)
          throw new Error(`Make webhook ${webhookRes.status}`)
        }

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
