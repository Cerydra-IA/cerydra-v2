/**
 * Simule l'assignation en masse de réservations aux tables du plan de
 * salle — reproduit ce que fait linkResaToTable() dans PlanDeSalle.jsx,
 * mais en direct sur des dizaines/centaines de réservations pour révéler
 * les problèmes de contraintes (doublons de créneau, capacité) ou de
 * dérive qu'un test manuel ne peut pas couvrir.
 *
 * ⚠️  Refuse de tourner sur la production (mêmes garde-fous que simulate.mjs).
 *
 * Usage : npm run simulate:assignation
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
if (authErr) {
  console.error('❌ Connexion échouée :', authErr.message)
  process.exit(1)
}

const { data: resto, error: errResto } = await supabase
  .from('restaurants').select('id, nom, duree_occupation_minutes').eq('slug', SLUG).single()
if (errResto || !resto) {
  console.error(`❌ Restaurant « ${SLUG} » introuvable.`)
  process.exit(1)
}

const { data: tables } = await supabase
  .from('plan_tables').select('id, name, capacity, duration_minutes').eq('restaurant_id', resto.id).order('capacity')
if (!tables || tables.length === 0) {
  console.error('❌ Aucune table configurée pour ce restaurant.')
  process.exit(1)
}

// Réservations confirmées, à venir, pas déjà liées à une table
const { data: dejaPlacees } = await supabase
  .from('table_assignments').select('reservation_id').eq('restaurant_id', resto.id).not('reservation_id', 'is', null)
const idsPlacees = new Set((dejaPlacees || []).map((a) => a.reservation_id))

const aujourdhui = new Date().toISOString().split('T')[0]
const { data: reservations } = await supabase
  .from('reservations')
  .select('id, date, heure, nb_personnes, prenom, nom, message')
  .eq('restaurant_id', resto.id)
  .eq('statut', 'confirmée')
  .gte('date', aujourdhui)
  .order('date').order('heure')

const aPlacer = (reservations || []).filter((r) => !idsPlacees.has(r.id))

console.log(`\n🪑 Simulation d'assignation sur « ${resto.nom} »`)
console.log(`   ${aPlacer.length} réservations à venir non placées, ${tables.length} tables\n`)

const DUREE_DEFAUT = resto.duree_occupation_minutes || 90

// occupations[table_id] = liste de { debut, fin } déjà posées dans cette
// simulation (le check de chevauchement se fait ici, comme le ferait un
// restaurateur qui évite de superposer deux services sur la même table).
const occupations = {}
for (const t of tables) occupations[t.id] = []

const stats = { placees: 0, sansTable: 0, erreurs: 0 }
const erreursDetail = {}

for (const r of aPlacer) {
  const debut = new Date(`${r.date}T${r.heure}`).getTime()
  const duree = DUREE_DEFAUT * 60000
  const fin = debut + duree

  // Première table de capacité suffisante, libre sur ce créneau
  const table = tables
    .filter((t) => t.capacity >= r.nb_personnes)
    .find((t) => !occupations[t.id].some((o) => debut < o.fin && fin > o.debut))

  if (!table) {
    stats.sansTable++
    continue
  }

  const { error } = await supabase.from('table_assignments').insert({
    restaurant_id: resto.id,
    table_id: table.id,
    service_date: r.date,
    reservation_id: r.id,
    client_name: `${r.prenom} ${r.nom}`,
    nb_persons: r.nb_personnes,
    notes: r.message || null,
    status: 'reservee',
    service_at: new Date(debut).toISOString(),
    started_at: null,
    duration_minutes: table.duration_minutes || DUREE_DEFAUT,
  })

  if (error) {
    stats.erreurs++
    const code = (error.message.match(/[a-z_]{6,}/) || ['autre'])[0]
    erreursDetail[code] = (erreursDetail[code] || 0) + 1
  } else {
    occupations[table.id].push({ debut, fin })
    stats.placees++
  }
}

console.log(`📊 Bilan`)
console.log(`   Placées avec succès : ${stats.placees}`)
console.log(`   Sans table dispo    : ${stats.sansTable} (capacité insuffisante ce créneau — normal si le service est chargé)`)
console.log(`   Erreurs d'écriture  : ${stats.erreurs}`)
if (Object.keys(erreursDetail).length) {
  console.log('\n   Détail des erreurs :')
  for (const [motif, n] of Object.entries(erreursDetail).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${String(n).padStart(4)} × ${motif}`)
  }
}
console.log(`
✅ Terminé. À vérifier dans le Plan de salle :
   - les pastilles ×N apparaissent sur les tables à plusieurs services
   - le sélecteur d'heure fait bien changer la couleur des tables
   - aucune table n'affiche deux clients incohérents au même instant
`)
