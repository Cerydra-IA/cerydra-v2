import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAKE_WEBHOOK_URL = Deno.env.get('MAKE_REMINDER_WEBHOOK_URL')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? ''
  if (auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const now   = new Date()
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    // Fenêtre SQL : aujourd'hui + demain (large, filtre précis après)
    const todayStr    = now.toISOString().split('T')[0]
    const tomorrowStr = in48h.toISOString().split('T')[0]

    console.log('[send-reminders] now (UTC)    :', now.toISOString())
    console.log('[send-reminders] SQL date gte :', todayStr)
    console.log('[send-reminders] SQL date lte :', tomorrowStr)

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('id, prenom, nom, email, date, heure, nb_personnes, statut, token, restaurants(nom, slug)')
      .eq('reminder_sent', false)
      .neq('statut', 'annulée')
      .gte('date', todayStr)
      .lte('date', tomorrowStr)

    if (error) throw error

    console.log('[send-reminders] Réservations trouvées :', reservations?.length ?? 0)

    if (!reservations || reservations.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'Aucun rappel à envoyer' }), { status: 200 })
    }

    let sent = 0
    const errors: string[] = []

    for (const resa of reservations) {
      // Seul filtre : la réservation n'est pas déjà passée (date aujourd'hui + heure déjà passée)
      // On traite TOUT ce qui est dans les 48h à venir — reminder_sent empêche les doublons
      const resaDateStr = new Date(`${resa.date}T${resa.heure}:00`)
      const resaDateUTC = new Date(resa.date + 'T00:00:00Z') // minuit UTC de la date

      // Si la date de réservation est aujourd'hui et que l'heure est déjà passée → skip
      if (resa.date === todayStr && resaDateStr.getTime() < now.getTime()) {
        console.log(`[send-reminders] SKIP ${resa.id} — réservation aujourd'hui mais heure passée`)
        continue
      }

      console.log(`[send-reminders] TRAITÉ ${resa.id} — ${resa.date} ${resa.heure}`)

      const restaurant = Array.isArray(resa.restaurants) ? resa.restaurants[0] : resa.restaurants
      const cancelLink = `https://app.cerydra.fr/annuler/${resa.token}`

      try {
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ reminder_sent: true })
          .eq('id', resa.id)

        if (updateError) throw updateError

        const webhookRes = await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id:              resa.id,
            prenom:          resa.prenom,
            nom:             resa.nom,
            email:           resa.email,
            date:            resa.date,
            heure:           resa.heure,
            nb_personnes:    resa.nb_personnes,
            restaurant:      restaurant?.nom ?? '',
            slug:            restaurant?.slug ?? '',
            lien_annulation: cancelLink,
          }),
        })

        if (!webhookRes.ok) {
          await supabase.from('reservations').update({ reminder_sent: false }).eq('id', resa.id)
          throw new Error(`Make webhook ${webhookRes.status}`)
        }

        console.log(`[send-reminders] ✅ Rappel envoyé : ${resa.id}`)
        sent++

      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[send-reminders] Erreur ${resa.id}:`, msg)
        errors.push(`${resa.id}: ${msg}`)
      }
    }

    console.log(`[send-reminders] RÉSULTAT — sent: ${sent}, errors: ${errors.length}`)

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
