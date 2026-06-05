import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAKE_WEBHOOK_URL = Deno.env.get('MAKE_REMINDER_WEBHOOK_URL')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

Deno.serve(async (_req) => {
  try {
    const now   = new Date()
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    const todayStr    = now.toISOString().split('T')[0]
    const tomorrowStr = in48h.toISOString().split('T')[0]

    console.log('[send-reminders] now:', now.toISOString(), '| fenêtre:', todayStr, '->', tomorrowStr)

    // Requête sans join pour éviter les erreurs PostgREST
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('id, prenom, nom, email, date, heure, nb_personnes, statut, cancel_token, restaurant_id')
      .eq('reminder_sent', false)
      .neq('statut', 'annulée')
      .gte('date', todayStr)
      .lte('date', tomorrowStr)

    if (error) throw new Error(`Supabase query: ${error.message}`)

    console.log('[send-reminders] Réservations trouvées:', reservations?.length ?? 0)

    if (!reservations || reservations.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'Aucun rappel à envoyer' }), { status: 200 })
    }

    // Récupère les noms de restaurants séparément
    const restaurantIds = [...new Set(reservations.map(r => r.restaurant_id))]
    const { data: restos } = await supabase
      .from('restaurants')
      .select('id, nom, slug')
      .in('id', restaurantIds)

    const restoMap: Record<string, { nom: string; slug: string }> = {}
    for (const r of restos ?? []) restoMap[r.id] = { nom: r.nom, slug: r.slug }

    let sent = 0
    const errors: string[] = []

    for (const resa of reservations) {
      // Skip si réservation aujourd'hui et heure déjà passée
      if (resa.date === todayStr) {
        const [h, m] = resa.heure.split(':').map(Number)
        const resaMs = new Date(resa.date).setHours(h, m, 0, 0)
        if (resaMs < now.getTime()) {
          console.log(`[send-reminders] SKIP ${resa.id} — heure passée`)
          continue
        }
      }

      console.log(`[send-reminders] Traitement: ${resa.id} | ${resa.date} ${resa.heure}`)

      const resto     = restoMap[resa.restaurant_id] ?? { nom: '', slug: '' }
      const cancelLink = `https://app.cerydra.fr/annuler/${resa.cancel_token}`

      try {
        // Marquer avant d'envoyer pour éviter les doublons
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ reminder_sent: true })
          .eq('id', resa.id)

        if (updateError) throw new Error(`Update: ${updateError.message}`)

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
            restaurant:      resto.nom,
            slug:            resto.slug,
            lien_annulation: cancelLink,
          }),
        })

        if (!webhookRes.ok) {
          await supabase.from('reservations').update({ reminder_sent: false }).eq('id', resa.id)
          throw new Error(`Webhook ${webhookRes.status}: ${await webhookRes.text()}`)
        }

        console.log(`[send-reminders] ✅ Envoyé: ${resa.id}`)
        sent++

      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : JSON.stringify(e)
        console.error(`[send-reminders] Erreur ${resa.id}:`, msg)
        errors.push(`${resa.id}: ${msg}`)
      }
    }

    return new Response(
      JSON.stringify({ sent, errors: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('[send-reminders] Erreur globale:', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
})
