import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAKE_WEBHOOK_URL   = Deno.env.get('MAKE_REMINDER_WEBHOOK_URL')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  // Sécurité : autorise uniquement les appels avec le service role key
  const auth = req.headers.get('Authorization') ?? ''
  if (auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const now      = new Date()
    const in24h    = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in23h    = new Date(now.getTime() + 23 * 60 * 60 * 1000)

    // Récupère les réservations dont la date+heure est dans la fenêtre [+23h, +24h]
    // reminder_sent = false et statut != 'annulée'
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        id, prenom, nom, email, date, heure, nb_personnes, statut, token,
        restaurants ( nom, slug )
      `)
      .eq('reminder_sent', false)
      .neq('statut', 'annulée')
      .gte('date', in23h.toISOString().split('T')[0])
      .lte('date', in24h.toISOString().split('T')[0])

    if (error) throw error
    if (!reservations || reservations.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'Aucun rappel à envoyer' }), { status: 200 })
    }

    let sent = 0
    const errors: string[] = []

    for (const resa of reservations) {
      // Filtre précis sur heure pour rester dans la fenêtre [+23h, +24h]
      const resaDatetime = new Date(`${resa.date}T${resa.heure}:00`)
      if (resaDatetime < in23h || resaDatetime > in24h) continue

      const restaurant = Array.isArray(resa.restaurants) ? resa.restaurants[0] : resa.restaurants
      const cancelLink = `https://app.cerydra.fr/annuler/${resa.token}`

      try {
        const webhookRes = await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id:            resa.id,
            prenom:        resa.prenom,
            nom:           resa.nom,
            email:         resa.email,
            date:          resa.date,
            heure:         resa.heure,
            nb_personnes:  resa.nb_personnes,
            restaurant:    restaurant?.nom ?? '',
            slug:          restaurant?.slug ?? '',
            lien_annulation: cancelLink,
          }),
        })

        if (!webhookRes.ok) {
          const text = await webhookRes.text()
          throw new Error(`Make webhook ${webhookRes.status}: ${text}`)
        }

        // Marque le rappel comme envoyé
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ reminder_sent: true })
          .eq('id', resa.id)

        if (updateError) throw updateError
        sent++

      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[send-reminders] Erreur réservation ${resa.id}:`, msg)
        errors.push(`${resa.id}: ${msg}`)
      }
    }

    return new Response(
      JSON.stringify({ sent, errors: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[send-reminders] Erreur globale:', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
})
