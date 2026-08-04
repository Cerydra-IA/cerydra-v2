/**
 * Logique temporelle du plan de salle.
 *
 * Volontairement séparée du composant : pure, sans dépendance React ni réseau,
 * donc testable directement en Node (voir tests/logic/planStatus.test.mjs).
 */

export const TABLE_DEFAULT_DURATION = 90

// Fenêtres temporelles
export const NO_SHOW_GRACE_MIN = 30    // puis « en retard » si personne ne s'installe
export const OCCUPEE_GRACE_MIN = 15    // libération auto : durée + 15 min

/**
 * État affiché d'une table à l'instant `now`, calculé à partir de l'intention
 * stockée (status) et des horodatages (started_at / service_at).
 *
 * Retourne { status, late?, expired?, at? } :
 *   - expired  : la ligne en base est périmée, à libérer
 *   - late     : l'heure est passée, le client ne s'est pas installé
 *
 * `now` doit être l'horloge RÉELLE, pas l'heure consultée dans le sélecteur
 * du plan (momentVu) : le retard et l'expiration sont des faits qui se
 * produisent dans le temps réel, pas dans l'instant qu'on prévisualise. Le
 * choix de QUEL service afficher pour un instant prévisualisé est déjà fait
 * en amont par serviceAuMoment() ; deriveStatus() ne fait qu'habiller le
 * service déjà sélectionné, jamais le re-filtrer par rapport à `now`.
 */
/**
 * Service d'une table couvrant un instant donné.
 *
 * Une table peut recevoir plusieurs services dans la journée (19 h puis 21 h).
 * On retient celui dont la fenêtre [début, début + durée] contient le moment
 * demandé. Un blocage (sans horaire) vaut pour la journée entière et prime.
 *
 * @param {Array} services  lignes d'assignation de CETTE table pour le jour
 * @param {number} moment   instant considéré (millisecondes)
 */
export function serviceAuMoment(services, moment) {
  if (!services || services.length === 0) return null

  const blocage = services.find((a) => a.status === 'bloquee' && !a.service_at)
  if (blocage) return blocage

  return (
    services.find((a) => {
      if (!a.service_at) return false
      const debut = new Date(a.service_at).getTime()
      const duree = (a.duration_minutes || TABLE_DEFAULT_DURATION) * 60000
      return moment >= debut && moment < debut + duree
    }) || null
  )
}

/** Nombre de services prévus sur une table dans la journée (hors blocage). */
export function nombreServices(services) {
  return (services || []).filter((a) => a.service_at && a.status !== 'bloquee').length
}

export function deriveStatus(a, now = Date.now(), planning = false) {
  if (!a || a.status === 'libre') return { status: 'libre' }
  if (a.status === 'bloquee') return { status: 'bloquee' }  // jamais automatique

  // Mode planification (on consulte un autre jour que celui en cours) :
  // l'horloge n'a pas de sens, on montre l'intention de placement telle quelle.
  if (planning) {
    return { status: a.status, at: a.service_at || a.started_at || null, planning: true }
  }

  const dureeMs = (a.duration_minutes || TABLE_DEFAULT_DURATION) * 60000

  if (a.status === 'occupee') {
    if (!a.started_at) return { status: 'occupee' }         // legacy : on respecte
    const fin = new Date(a.started_at).getTime() + dureeMs + OCCUPEE_GRACE_MIN * 60000
    if (now >= fin) return { status: 'libre', expired: true }
    return { status: 'occupee', at: a.started_at }
  }

  if (a.status === 'reservee') {
    if (!a.service_at) return { status: 'reservee' }        // legacy : on respecte
    const t = new Date(a.service_at).getTime()
    if (now > t + dureeMs + (NO_SHOW_GRACE_MIN + 60) * 60000) {
      return { status: 'libre', expired: true }
    }
    if (now > t + NO_SHOW_GRACE_MIN * 60000) {
      return { status: 'reservee', late: true, at: a.service_at }
    }
    return { status: 'reservee', at: a.service_at }
  }

  return { status: a.status }
}
