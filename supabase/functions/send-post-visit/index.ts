import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAKE_WEBHOOK_URL = Deno.env.get('MAKE_POST_VISIT_WEBHOOK_URL')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

/**
 * Convertit une date+heure saisie en heure locale Europe/Paris
 * vers un timestamp UTC en millisecondes.
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

    // Fenêtre cible : réservations dont l'heure Paris était entre now-26h et now-22h
    const windowStartMs = now.getTime() - 26 * 60 * 60 * 1000
    const windowEndMs   = now.getTime() - 22 * 60 * 60 * 1000

    const windowStart = new Date(windowStartMs)
    const windowEnd   = new Date(windowEndMs)

    // Plage SQL large pour couvrir le décalage horaire Paris/UTC
    // ±1 jour de marge pour ne pas rater les réservations en bordure de journée (DST, minuit Paris)
    const dateFrom = new Date(windowStartMs - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const dateTo   = new Date(windowEndMs   + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log('[send-post-visit] now (UTC):', now.toISOString())
    console.log('[send-post-visit] fenêtre UTC:', windowStart.toISOString(), '->', windowEnd.toISOString())
    console.log('[send-post-visit] plage SQL dates:', dateFrom, '->', dateTo)

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('id, prenom, nom, email, date, heure, nb_personnes, restaurant_id')
      .eq('post_visit_sent', false)
      .eq('statut', 'confirmée')
      .gte('date', dateFrom)
      .lte('date', dateTo)

    if (error) throw new Error(`Supabase query: ${error.message}`)

    console.log('[send-post-visit] Réservations dans la plage SQL:', reservations?.length ?? 0)

    if (!reservations || reservations.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'Aucun email post-visite à envoyer' }), { status: 200 })
    }

    // Filtre précis timezone : heure de réservation (Paris) convertie en UTC
    // doit être dans [now-26h, now-22h]
    const qualifying = reservations.filter(resa => {
      const resaUtcMs = parisToUtcMs(resa.date, resa.heure)
      const inWindow  = resaUtcMs >= windowStartMs && resaUtcMs <= windowEndMs
      console.log(
        `[send-post-visit] ${resa.id} | Paris: ${resa.date} ${resa.heure}`,
        `| UTC: ${new Date(resaUtcMs).toISOString()}`,
        `| dans fenêtre: ${inWindow}`
      )
      return inWindow
    })

    console.log('[send-post-visit] Après filtre timezone:', qualifying.length)

    if (qualifying.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'Aucun email post-visite dans la fenêtre 22h-26h' }),
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
      console.log(`[send-post-visit] Traitement: ${resa.id} | ${resa.date} ${resa.heure}`)

      const resto = restoMap[resa.restaurant_id] ?? { nom: '', slug: '' }

      // Marquer avant d'envoyer pour éviter les doublons
      let flagSet = false
      try {
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ post_visit_sent: true })
          .eq('id', resa.id)

        if (updateError) throw new Error(`Update: ${updateError.message}`)
        flagSet = true

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
            restaurant:   resto.nom,
            slug:         resto.slug,
          }),
        })

        if (!webhookRes.ok) {
          throw new Error(`Webhook ${webhookRes.status}: ${await webhookRes.text()}`)
        }

        console.log(`[send-post-visit] ✅ Envoyé: ${resa.id}`)
        sent++

      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : JSON.stringify(e)
        console.error(`[send-post-visit] Erreur ${resa.id}:`, msg)
        errors.push(`${resa.id}: ${msg}`)
        // Revert du flag pour que l'email soit retenté à la prochaine exécution
        if (flagSet) {
          await supabase.from('reservations').update({ post_visit_sent: false }).eq('id', resa.id)
        }
      }
    }

    return new Response(
      JSON.stringify({ sent, errors: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('[send-post-visit] Erreur globale:', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
})
