/**
 * Script de test — email post-visite
 * Usage : node scripts/test-post-visit.mjs <MAKE_WEBHOOK_URL>
 * Ex    : node scripts/test-post-visit.mjs https://hook.eu2.make.com/xxxx
 */

const webhookUrl = process.argv[2]

if (!webhookUrl) {
  console.error('❌  Donne l\'URL du webhook Make.com en argument :')
  console.error('   node scripts/test-post-visit.mjs https://hook.eu2.make.com/xxxx')
  process.exit(1)
}

const payload = {
  id:           'test-' + Date.now(),
  prenom:       'Jean',
  nom:          'Dupont',
  email:        'contact@cerydra.fr',
  date:         new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  heure:        '19:30',
  nb_personnes: 2,
  restaurant:   'Le Petit Bistrot',
  slug:         'le-petit-bistrot',
}

console.log('\n📤  Payload envoyé :\n', JSON.stringify(payload, null, 2))

const res = await fetch(webhookUrl, {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify(payload),
})

const text = await res.text()

if (res.ok) {
  console.log(`\n✅  Webhook déclenché avec succès (${res.status})`)
  console.log('   Réponse Make.com :', text)
} else {
  console.error(`\n❌  Erreur (${res.status}) :`, text)
}
