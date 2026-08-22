/**
 * Simule les scénarios "terrain" du plan de salle qui n'arrivent pas via
 * le formulaire public : walk-in (client sans réservation), table
 * bloquée, no-show, entrée en liste d'attente. Complète simulate.mjs
 * (création de réservations) et simulate_assignation.mjs (placement).
 *
 * Usage : npm run simulate:scenarios
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const REF_PROD = 'wuyltmbakpcvimqspqnb'
const SLUG = 'chez-cerydra'

let env = {}
try {
  env = Object.fromEntries(
    readFileSync('.env.staging', 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
  )
} catch {
  console.error('❌ Fichier .env.staging introuvable.')
  process.exit(1)
}

const { STAGING_URL: URL, STAGING_ANON_KEY: KEY, STAGING_EMAIL: EMAIL, STAGING_PASSWORD: PASSWORD } = env
if (!URL || !KEY || !EMAIL || !PASSWORD) {
  console.error('❌ STAGING_URL, STAGING_ANON_KEY, STAGING_EMAIL et STAGING_PASSWORD sont requis dans .env.staging')
  process.exit(1)
}
if (URL.includes(REF_PROD)) {
  console.error('🛑 STOP : cette URL est la PRODUCTION.')
  process.exit(1)
}

const supabase = createClient(URL, KEY)
const { error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
if (authErr) { console.error('❌ Connexion échouée :', authErr.message); process.exit(1) }

const { data: resto } = await supabase.from('restaurants').select('id, nom, duree_occupation_minutes').eq('slug', SLUG).single()
const { data: tables } = await supabase.from('plan_tables').select('*').eq('restaurant_id', resto.id)
const DUREE = resto.duree_occupation_minutes || 90

console.log(`\n🎭 Simulation des scénarios terrain sur « ${resto.nom} »\n`)
const rapport = []

// ── 1. Walk-ins : clients arrivés sans réservation ─────────────────────────
// Table libre "aujourd'hui + 2" à midi, occupée directement (comme le
// ferait un serveur via "Assigner un client walk-in").
const dansDeuxJours = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
let walkinsOk = 0, walkinsErr = 0
for (const t of tables.slice(0, 3)) {
  const { error } = await supabase.from('table_assignments').insert({
    restaurant_id: resto.id, table_id: t.id, service_date: dansDeuxJours,
    client_name: 'Sans nom', nb_persons: Math.min(2, t.capacity),
    status: 'occupee', started_at: new Date().toISOString(),
    service_at: new Date().toISOString(), duration_minutes: t.duration_minutes || DUREE,
  })
  error ? walkinsErr++ : walkinsOk++
}
rapport.push(['Walk-ins (occupée directe)', walkinsOk, walkinsErr])

// ── 2. Tables bloquées (maintenance, événement privé) ──────────────────────
const dansTroisJours = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
let blocOk = 0, blocErr = 0
for (const t of tables.slice(3, 5)) {
  const { error } = await supabase.from('table_assignments').insert({
    restaurant_id: resto.id, table_id: t.id, service_date: dansTroisJours,
    status: 'bloquee', service_at: null,
  })
  error ? blocErr++ : blocOk++
}
rapport.push(['Tables bloquées', blocOk, blocErr])

// Redondance volontaire : re-bloquer une table déjà bloquée doit être un
// no-op propre (upsert applicatif), pas une erreur de contrainte brute.
const { error: blocDoublon } = await supabase.from('table_assignments').insert({
  restaurant_id: resto.id, table_id: tables[3].id, service_date: dansTroisJours,
  status: 'bloquee', service_at: null,
})
rapport.push(['  └ doublon blocage (doit échouer proprement)', blocDoublon ? 1 : 0, blocDoublon ? 0 : 1])

// ── 3. No-show : réservation jamais honorée, marquée à la main ─────────────
// Reprend une résa déjà placée par simulate_assignation.mjs, la marque
// no-show comme le ferait le bouton "Marquer no-show" du plan de salle.
const { data: unePlacee } = await supabase
  .from('table_assignments').select('id, reservation_id').eq('restaurant_id', resto.id)
  .eq('status', 'reservee').not('reservation_id', 'is', null).limit(1).single()

let noShowOk = false
if (unePlacee) {
  const { error: delErr } = await supabase.from('table_assignments').delete().eq('id', unePlacee.id)
  const { error: majErr } = await supabase.from('reservations').update({ statut: 'no_show' }).eq('id', unePlacee.reservation_id)
  noShowOk = !delErr && !majErr
}
rapport.push(['No-show (libération + statut résa)', noShowOk ? 1 : 0, unePlacee ? (noShowOk ? 0 : 1) : 0])
if (!unePlacee) console.log('   ⚠️  Aucune réservation placée trouvée pour tester le no-show (lance simulate_assignation.mjs avant)')

// ── 4. Liste d'attente : journée complète, client laisse ses coordonnées ──
const dansQuatreJours = new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0]
let attenteOk = 0, attenteErr = 0
for (const prenom of ['Farid', 'Nora', 'Simon']) {
  const { error } = await supabase.from('liste_attente').insert({
    restaurant_id: resto.id, prenom, nom: 'Test', email: `${prenom.toLowerCase()}@exemple.fr`,
    telephone: '0600000000', date: dansQuatreJours, nb_personnes: 4,
  })
  error ? attenteErr++ : attenteOk++
}
rapport.push(['Liste d\'attente', attenteOk, attenteErr])

// ── Bilan ───────────────────────────────────────────────────────────────
console.log('📊 Bilan par scénario')
for (const [nom, ok, err] of rapport) {
  console.log(`   ${nom.padEnd(45)} ${String(ok).padStart(2)} ok  /  ${err} erreur${err > 1 ? 's' : ''}`)
}
console.log(`
✅ Terminé. À vérifier :
   - Plan de salle, ${dansDeuxJours} : 3 tables occupées (walk-in "Sans nom")
   - Plan de salle, ${dansTroisJours} : 2 tables bloquées toute la journée
   - Réservations : une résa passée en statut "No-show"
   - Réservations → Liste d'attente : 3 entrées pour le ${dansQuatreJours}
`)
