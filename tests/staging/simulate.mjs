/**
 * Générateur de trafic réaliste — compresse des semaines d'usage en quelques
 * minutes pour révéler les bugs d'accumulation et de dérive temporelle.
 *
 * ⚠️  Refuse de tourner sur la production : il crée de vraies réservations,
 *     ce qui déclencherait de vrais emails et de vraies notifications.
 *
 * Configuration — créer un fichier .env.staging à la racine (non versionné) :
 *   STAGING_URL=https://xxxx.supabase.co
 *   STAGING_ANON_KEY=eyJ...
 *
 * Usage :
 *   npm run simulate              → 14 jours de trafic
 *   npm run simulate -- 30        → 30 jours
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const REF_PROD = 'wuyltmbakpcvimqspqnb'
const SLUG = 'chez-cerydra'

// ── Configuration ───────────────────────────────────────────────────────────
let env = {}
try {
  env = Object.fromEntries(
    readFileSync('.env.staging', 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
  )
} catch {
  console.error('❌ Fichier .env.staging introuvable. Voir tests/README.md')
  process.exit(1)
}

const URL = env.STAGING_URL
const KEY = env.STAGING_ANON_KEY
if (!URL || !KEY) {
  console.error('❌ STAGING_URL et STAGING_ANON_KEY sont requis dans .env.staging')
  process.exit(1)
}
if (URL.includes(REF_PROD)) {
  console.error('🛑 STOP : cette URL est la PRODUCTION. La simulation enverrait de vrais emails.')
  process.exit(1)
}

const JOURS = Number(process.argv[2]) || 14
const supabase = createClient(URL, KEY)

// ── Données fictives ────────────────────────────────────────────────────────
const PRENOMS = ['Sophie', 'Lucas', 'Emma', 'Hugo', 'Léa', 'Nathan', 'Chloé', 'Louis',
  'Manon', 'Gabriel', 'Camille', 'Adam', 'Jade', 'Raphaël', 'Louise', 'Arthur']
const NOMS = ['Martin', 'Bernard', 'Dubois', 'Petit', 'Robert', 'Richard', 'Durand',
  'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Roux']
const MESSAGES = [null, null, null, null, 'Allergie aux fruits de mer',
  'Anniversaire', 'Chaise haute svp', 'Table près de la fenêtre si possible',
  'Nous serons peut-être 10 min en retard']

const alea = (t) => t[Math.floor(Math.random() * t.length)]
const entier = (min, max) => min + Math.floor(Math.random() * (max - min + 1))

// ── Contexte du restaurant ──────────────────────────────────────────────────
const { data: resto, error: errResto } = await supabase
  .from('restaurants').select('id, nom').eq('slug', SLUG).single()
if (errResto || !resto) {
  console.error(`❌ Restaurant « ${SLUG} » introuvable. Exécute d'abord 02_seed.sql.`)
  process.exit(1)
}
const { data: horaires } = await supabase
  .from('horaires').select('*').eq('restaurant_id', resto.id)

const JOURS_SEM = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/** Créneaux réservables du jour (pas de 30 min, dernière arrivée 1 h avant la fermeture) */
function creneaux(date) {
  const h = horaires.find((x) => x.jour === JOURS_SEM[date.getDay()])
  if (!h || !h.ouvert) return []
  const out = []
  for (const [debut, fin] of [[h.midi_debut, h.midi_fin], [h.soir_debut, h.soir_fin]]) {
    const [hd, md] = debut.split(':').map(Number)
    const [hf, mf] = fin.split(':').map(Number)
    for (let m = hd * 60 + md; m <= hf * 60 + mf - 60; m += 30) {
      out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
    }
  }
  return out
}

// ── Simulation ──────────────────────────────────────────────────────────────
console.log(`\n🎬 Simulation de ${JOURS} jours sur « ${resto.nom} » (${URL})\n`)

const stats = { tentees: 0, acceptees: 0 }
const refus = {}
const debut = Date.now()

for (let j = 1; j <= JOURS; j++) {
  const date = new Date()
  date.setDate(date.getDate() + j)
  const dateStr = date.toISOString().split('T')[0]
  const slots = creneaux(date)
  if (slots.length === 0) {
    console.log(`  ${dateStr} (${JOURS_SEM[date.getDay()]})  fermé`)
    continue
  }

  // week-end plus chargé, comme dans la vraie vie
  const weekend = [0, 5, 6].includes(date.getDay())
  const nbResas = weekend ? entier(10, 18) : entier(4, 10)

  let okJour = 0
  for (let i = 0; i < nbResas; i++) {
    const prenom = alea(PRENOMS)
    const nom = alea(NOMS)
    stats.tentees++

    // Les réservations d'un même service n'arrivent pas dans la même minute :
    // on étale les dates de création entre 1 h et 20 jours dans le passé.
    // Sans cela, l'anti-spam (10 créations / 10 min) bloque tout — ce qui est
    // le comportement attendu en production, mais fausserait la simulation.
    // Le décalage se calcule par rapport à maintenant (et non à la date du
    // service), sinon certaines créations retombent dans la fenêtre courante.
    const creeLe = new Date(Date.now() - entier(60, 60 * 24 * 20) * 60000)

    const { error } = await supabase.from('reservations').insert({
      restaurant_id: resto.id,
      prenom,
      nom,
      email: `${prenom.toLowerCase()}.${nom.toLowerCase()}${entier(1, 999)}@exemple.fr`,
      telephone: `06${entier(10000000, 99999999)}`,
      date: dateStr,
      heure: alea(slots),
      nb_personnes: alea([1, 2, 2, 2, 3, 4, 4, 5, 6]),
      message: alea(MESSAGES),
      statut: 'confirmée',
      created_at: creeLe.toISOString(),
    })
    if (error) {
      const code = (error.message.match(/[a-z_]{6,}/) || ['autre'])[0]
      refus[code] = (refus[code] || 0) + 1
    } else {
      stats.acceptees++
      okJour++
    }
  }
  console.log(
    `  ${dateStr} (${JOURS_SEM[date.getDay()].padEnd(9)}) ${weekend ? '🔥' : '  '} ` +
    `${String(okJour).padStart(2)} acceptées / ${nbResas} tentées`
  )
}

// ── Bilan ───────────────────────────────────────────────────────────────────
console.log(`\n📊 Bilan (${((Date.now() - debut) / 1000).toFixed(1)} s)`)
console.log(`   Tentées   : ${stats.tentees}`)
console.log(`   Acceptées : ${stats.acceptees}`)
console.log(`   Refusées  : ${stats.tentees - stats.acceptees}`)
if (Object.keys(refus).length) {
  console.log('\n   Motifs de refus :')
  for (const [motif, n] of Object.entries(refus).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${String(n).padStart(4)} × ${motif}`)
  }
}
console.log(`
✅ Terminé. À vérifier maintenant :
   - le plan de salle affiche des couleurs cohérentes (rien de figé)
   - les créneaux complets sont bien refusés (motif « creneau_complet »)
   - aucun refus inattendu dans la liste ci-dessus
   - les statistiques du dashboard correspondent
`)
