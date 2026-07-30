/**
 * Logique temporelle du plan de salle.
 *
 * Volontairement séparée du composant : pure, sans dépendance React ni réseau,
 * donc testable directement en Node (voir tests/logic/planStatus.test.mjs).
 */

export const TABLE_DEFAULT_DURATION = 90

// Fenêtres temporelles
export const RESERVEE_LEAD_MIN = 120   // une résa devient jaune 2 h avant l'heure
export const NO_SHOW_GRACE_MIN = 30    // puis « en retard » si personne ne s'installe
export const OCCUPEE_GRACE_MIN = 15    // libération auto : durée + 15 min

/**
 * État affiché d'une table à l'instant `now`, calculé à partir de l'intention
 * stockée (status) et des horodatages (started_at / service_at).
 *
 * Retourne { status, late?, upcoming?, expired?, at? } :
 *   - expired  : la ligne en base est périmée, à libérer
 *   - upcoming : réservation encore lointaine → la table est utilisable
 *   - late     : l'heure est passée, le client ne s'est pas installé
 */
export function deriveStatus(a, now = Date.now()) {
  if (!a || a.status === 'libre') return { status: 'libre' }
  if (a.status === 'bloquee') return { status: 'bloquee' }  // jamais automatique

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
    if (now < t - RESERVEE_LEAD_MIN * 60000) {
      return { status: 'libre', upcoming: true, at: a.service_at }
    }
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
