/**
 * Tests de la logique temporelle du plan de salle.
 * Lancer : npm test
 */
import { deriveStatus } from '../../src/lib/planStatus.js'

const N = Date.now()
const min = (x) => x * 60000
const iso = (m) => new Date(N + min(m)).toISOString()

const cas = [
  // [description, assignment, état attendu]
  ['aucune assignation',            null,                                                              'libre'],
  ['libre explicite',               { status: 'libre' },                                               'libre'],
  ['bloquée (jamais automatique)',  { status: 'bloquee' },                                             'bloquee'],
  ['bloquée depuis 3 jours',        { status: 'bloquee', created_at: iso(-4320) },                     'bloquee'],

  // Occupée : libérée après durée + 15 min de grâce
  ['occupée depuis 30 min',         { status: 'occupee', started_at: iso(-30),  duration_minutes: 90 }, 'occupee'],
  ['occupée depuis 100 min',        { status: 'occupee', started_at: iso(-100), duration_minutes: 90 }, 'occupee'],
  ['occupée depuis 105 min (fin)',  { status: 'occupee', started_at: iso(-105), duration_minutes: 90 }, 'libre+expired'],
  ['occupée depuis 3 jours',        { status: 'occupee', started_at: iso(-4320), duration_minutes: 90 }, 'libre+expired'],
  ['occupée sans chrono (legacy)',  { status: 'occupee' },                                             'occupee'],
  ['occupée durée 120 min',         { status: 'occupee', started_at: iso(-120), duration_minutes: 120 }, 'occupee'],

  // Réservée : jaune 2 h avant, « en retard » 30 min après
  ['résa dans 5 h',                 { status: 'reservee', service_at: iso(300), duration_minutes: 90 }, 'libre+upcoming'],
  ['résa dans 2 h 05',              { status: 'reservee', service_at: iso(125), duration_minutes: 90 }, 'libre+upcoming'],
  ['résa dans 1 h 55 (fenêtre)',    { status: 'reservee', service_at: iso(115), duration_minutes: 90 }, 'reservee'],
  ['résa dans 10 min',              { status: 'reservee', service_at: iso(10),  duration_minutes: 90 }, 'reservee'],
  ['résa il y a 20 min',            { status: 'reservee', service_at: iso(-20), duration_minutes: 90 }, 'reservee'],
  ['résa il y a 45 min (no-show)',  { status: 'reservee', service_at: iso(-45), duration_minutes: 90 }, 'reservee+late'],
  ['résa il y a 3 h',               { status: 'reservee', service_at: iso(-180), duration_minutes: 90 }, 'reservee+late'],
  ['résa il y a 4 h 30',            { status: 'reservee', service_at: iso(-270), duration_minutes: 90 }, 'libre+expired'],
  ['résa hier',                     { status: 'reservee', service_at: iso(-1440), duration_minutes: 90 }, 'libre+expired'],
  ['résa sans horodatage (legacy)', { status: 'reservee' },                                            'reservee'],
]

// Mode planification : on consulte un autre jour, l'horloge ne s'applique pas
const casPlanning = [
  ['planif : résa dans 5 jours',    { status: 'reservee', service_at: iso(7200), duration_minutes: 90 }, 'reservee'],
  ['planif : résa passée',          { status: 'reservee', service_at: iso(-7200), duration_minutes: 90 }, 'reservee'],
  ['planif : table occupée',        { status: 'occupee', started_at: iso(-7200), duration_minutes: 90 }, 'occupee'],
  ['planif : table bloquée',        { status: 'bloquee' },                                               'bloquee'],
  ['planif : table libre',          { status: 'libre' },                                                 'libre'],
]

let echecs = 0
const tous = [
  ...cas.map((c) => [...c, false]),
  ...casPlanning.map((c) => [...c, true]),
]
for (const [nom, a, attendu, planning] of tous) {
  const d = deriveStatus(a, N, planning)
  const obtenu =
    d.status +
    (d.expired ? '+expired' : '') +
    (d.upcoming ? '+upcoming' : '') +
    (d.late ? '+late' : '')
  const ok = obtenu === attendu
  if (!ok) echecs++
  console.log(
    `${ok ? '  PASS' : '  FAIL'}  ${nom.padEnd(32)} → ${obtenu}${ok ? '' : `   (attendu : ${attendu})`}`
  )
}

console.log(
  echecs === 0
    ? `\n✅ planStatus : ${tous.length}/${tous.length} tests passés`
    : `\n❌ planStatus : ${echecs} échec(s) sur ${tous.length}`
)
process.exit(echecs === 0 ? 0 : 1)
