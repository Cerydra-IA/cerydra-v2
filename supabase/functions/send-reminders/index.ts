import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAKE_WEBHOOK_URL = Deno.env.get('MAKE_REMINDER_WEBHOOK_URL')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

/**
 * Convertit une date+heure saisie en heure locale Europe/Paris
 * vers un timestamp UTC en millisecondes.
 *
 * Principe : on traite d'abord la chaîne comme UTC (approxUtc),
 * puis on calcule le décalage réel Paris→UTC à ce moment-là
 * via Intl.DateTimeFormat, et on corrige.
 *
 * Exemple (été, UTC+2) :
 *   "2026-06-09" + "19:30" → approxUtc = 19:30 UTC
 *   Paris pour 19:30 UTC = 21:30 → offsetMs = 19:30 - 21:30 = -2h
 *   UTC réel = 19:30 + (-2h) = 17:30 UTC ✓
 */
function parisToUtcMs(dateStr: string, heureStr: string): number {
  const heure5 = heureStr.slice(0, 5) // normalise "13:00:00" → "13:00"
  const approxUtc = new Date(`${dateStr}T${heure5}:00Z`)

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts = fmt.formatToParts(approxUtc)
  const p = (t: string) => parseInt(parts.find(x => x.type === t)!.value)
  const parisEquiv = new Date(Date.UTC(p('year'), p('month') - 1, p('day'), p('hour'), p('minute')))

  const offsetMs = approxUtc.getTime() - parisEquiv.getTime()
  return approxUtc.getTime() + offsetMs
}

Deno.serve(async (_req) => {
  try {
    const now = new Date()

    // Fenêtre cible : réservations dont l'heure Paris est entre now+22h et now+26h
    const windowStartMs = now.getTime() + 22 * 60 * 60 * 1000
    const windowEndMs   = now.getTime() + 26 * 60 * 60 * 1000

    const windowStart = new Date(windowStartMs)
    const windowEnd   = new Date(windowEndMs)

    // Pour la requête SQL, on prend une plage de dates large (couvre J à J+2)
    // pour ne pas rater des réservations à cause du décalage horaire Paris/UTC.
    // Le filtre précis se fait ensuite en JS avec parisToUtcMs.
    // ±1 jour de marge pour ne pas rater les réservations en bordure de journée (DST, minuit Paris)
    const dateFrom = new Date(windowStartMs - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const dateTo   = new Date(windowEndMs   + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log('[send-reminders] now (UTC):', now.toISOString())
    console.log('[send-reminders] fenêtre UTC:', windowStart.toISOString(), '->', windowEnd.toISOString())
    console.log('[send-reminders] plage SQL dates:', dateFrom, '->', dateTo)

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('id, prenom, nom, email, date, heure, nb_personnes, statut, cancel_token, restaurant_id')
      .eq('reminder_sent', false)
      .neq('statut', 'annulée')
      .gte('date', dateFrom)
      .lte('date', dateTo)

    if (error) throw new Error(`Supabase query: ${error.message}`)

    console.log('[send-reminders] Réservations dans la plage SQL:', reservations?.length ?? 0)

    if (!reservations || reservations.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'Aucun rappel à envoyer' }), { status: 200 })
    }

    // Filtre précis timezone : heure de réservation (Paris) convertie en UTC
    // doit être dans [now+22h, now+26h]
    const qualifying = reservations.filter(resa => {
      const resaUtcMs = parisToUtcMs(resa.date, resa.heure)
      const inWindow  = resaUtcMs >= windowStartMs && resaUtcMs <= windowEndMs
      console.log(
        `[send-reminders] ${resa.id} | Paris: ${resa.date} ${resa.heure}`,
        `| UTC: ${new Date(resaUtcMs).toISOString()}`,
        `| dans fenêtre: ${inWindow}`
      )
      return inWindow
    })

    console.log('[send-reminders] Après filtre timezone:', qualifying.length)

    if (qualifying.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'Aucun rappel dans la fenêtre 22h-26h' }),
        { status: 200 }
      )
    }

    // Récupère les noms de restaurants séparément
    const restaurantIds = [...new Set(qualifying.map(r => r.restaurant_id))]
    const { data: restos } = await supabase
      .from('restaurants')
      .select('id, nom, slug')
      .in('id', restaurantIds)

    const restoMap: Record<string, { nom: string; slug: string }> = {}
    for (const r of restos ?? []) restoMap[r.id] = { nom: r.nom, slug: r.slug }

    let sent = 0
    const errors: string[] = []

    for (const resa of qualifying) {
      console.log(`[send-reminders] Traitement: ${resa.id} | ${resa.date} ${resa.heure}`)

      const resto      = restoMap[resa.restaurant_id] ?? { nom: '', slug: '' }
      const cancelLink = `https://app.cerydra.fr/annuler/${resa.cancel_token}`

      // Marquer avant d'envoyer pour éviter les doublons
      let flagSet = false
      try {
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ reminder_sent: true })
          .eq('id', resa.id)

        if (updateError) throw new Error(`Update: ${updateError.message}`)
        flagSet = true

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
          throw new Error(`Webhook ${webhookRes.status}: ${await webhookRes.text()}`)
        }

        console.log(`[send-reminders] ✅ Envoyé: ${resa.id}`)
        sent++

      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : JSON.stringify(e)
        console.error(`[send-reminders] Erreur ${resa.id}:`, msg)
        errors.push(`${resa.id}: ${msg}`)
        // Revert du flag pour que le rappel soit retenté à la prochaine exécution
        if (flagSet) {
          await supabase.from('reservations').update({ reminder_sent: false }).eq('id', resa.id)
        }
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
