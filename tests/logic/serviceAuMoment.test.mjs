/**
 * Tests du choix du service affiché sur une table.
 * Une table peut recevoir plusieurs services dans la journée.
 */
import { serviceAuMoment, nombreServices } from '../../src/lib/planStatus.js'

const J = '2026-08-04'
const h = (hhmm) => new Date(`${J}T${hhmm}:00`).getTime()
const resa = (hhmm, nom, duree = 90) => ({
  status: 'reservee', client_name: nom, duration_minutes: duree,
  service_at: new Date(`${J}T${hhmm}:00`).toISOString(),
})

const deuxTournees = [resa('19:00', 'Camille'), resa('21:00', 'Adam')]

const cas = [
  ['19:00 → première tournée',      deuxTournees, h('19:00'), 'Camille'],
  ['20:00 → toujours la première',  deuxTournees, h('20:00'), 'Camille'],
  ['20:29 → encore la première',    deuxTournees, h('20:29'), 'Camille'],
  ['20:35 → creux entre les deux',  deuxTournees, h('20:35'), null],
  ['21:00 → seconde tournée',       deuxTournees, h('21:00'), 'Adam'],
  ['22:00 → toujours la seconde',   deuxTournees, h('22:00'), 'Adam'],
  ['23:00 → plus personne',         deuxTournees, h('23:00'), null],
  ['12:00 → avant le service',      deuxTournees, h('12:00'), null],
  ['aucun service',                 [],           h('20:00'), null],
  ['blocage : prime à toute heure', [{ status: 'bloquee', client_name: 'BLOC', service_at: null }, ...deuxTournees],
                                                  h('19:00'), 'BLOC'],
  ['blocage : même hors service',   [{ status: 'bloquee', client_name: 'BLOC', service_at: null }],
                                                  h('03:00'), 'BLOC'],
  ['durée 120 min : 20:45 tient',   [resa('19:00', 'Long', 120)], h('20:45'), 'Long'],
]

let echecs = 0
for (const [nom, services, moment, attendu] of cas) {
  const r = serviceAuMoment(services, moment)
  const obtenu = r ? r.client_name : null
  const ok = obtenu === attendu
  if (!ok) echecs++
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${nom.padEnd(32)} → ${obtenu ?? '(libre)'}${ok ? '' : `   (attendu : ${attendu ?? '(libre)'})`}`)
}

// compteur de services
const compteurs = [
  ['deux tournées', deuxTournees, 2],
  ['avec blocage', [{ status: 'bloquee', service_at: null }, ...deuxTournees], 2],
  ['aucun', [], 0],
]
for (const [nom, services, attendu] of compteurs) {
  const n = nombreServices(services)
  const ok = n === attendu
  if (!ok) echecs++
  console.log(`${ok ? '  PASS' : '  FAIL'}  compteur ${nom.padEnd(23)} → ${n}${ok ? '' : `   (attendu : ${attendu})`}`)
}

const total = cas.length + compteurs.length
console.log(echecs === 0
  ? `\n✅ serviceAuMoment : ${total}/${total} tests passés`
  : `\n❌ serviceAuMoment : ${echecs} échec(s) sur ${total}`)
process.exit(echecs === 0 ? 0 : 1)
