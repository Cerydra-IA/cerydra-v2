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
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const todayStr    = now.toISOString().split('T')[0]
    const tomorrowStr = in24h.toISOString().split('T')[0]

    console.log('[send-reminders] ── DEBUT ──────────────────────────────')
    console.log('[send-reminders] now (UTC)    :', now.toISOString())
    console.log('[send-reminders] in24h (UTC)  :', in24h.toISOString())
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

    console.log('[send-reminders] Réservations trouvées par SQL :', reservations?.length ?? 0)

    if (!reservations || reservations.length === 0) {
      console.log('[send-reminders] Aucune réservation dans la fenêtre SQL')
      return new Response(JSON.stringify({ sent: 0, message: 'Aucun rappel à envoyer' }), { status: 200 })
    }

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    for (const resa of reservations) {
      const resaDatetime = new Date(`${resa.date}T${resa.heure}:00`)

      console.log(`[send-reminders] Réservation ${resa.id}:`)
      console.log(`  date=${resa.date} heure=${resa.heure}`)
      console.log(`  resaDatetime (interprété UTC): ${resaDatetime.toISOString()}`)
      console.log(`  resaDatetime <= now   ? ${resaDatetime <= now} (doit être false)`)
      console.log(`  resaDatetime > in24h  ? ${resaDatetime > in24h} (doit être false)`)
      console.log(`  → ${resaDatetime <= now || resaDatetime > in24h ? 'SKIPPED' : 'TRAITÉ'}`)

      // FIX : on élargit légèrement la fenêtre à +26h pour absorber la variance du cron
      const in26h = new Date(now.getTime() + 26 * 60 * 60 * 1000)
      if (resaDatetime <= now || resaDatetime > in26h) {
        skipped++
        continue
      }

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
        console.error(`[send-reminders] Erreur réservation ${resa.id}:`, msg)
        errors.push(`${resa.id}: ${msg}`)
      }
    }

    console.log(`[send-reminders] RÉSULTAT — sent: ${sent}, skipped: ${skipped}, errors: ${errors.length}`)

    return new Response(
      JSON.stringify({ sent, skipped, errors: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[send-reminders] Erreur globale:', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
})
