# Tests CERYDRA

Quatre niveaux, du plus rapide au plus complet. À faire **dans cet ordre** avant
chaque installation client ou après un changement important.

## 1. Logique métier — 2 secondes

```bash
npm test
```

Teste la logique temporelle du plan de salle (`src/lib/planStatus.js`) :
20 cas couvrant réservée / occupée / bloquée, les fenêtres d'apparition,
les no-shows et les libérations automatiques. Aucune base nécessaire.

## 2. Règles de réservation — 10 secondes

Colle `tests/sql/validation.sql` dans le **SQL Editor Supabase** et exécute.

20 vérifications : anti-doublon, capacité et rotation des tables, horaires,
dernière arrivée, fermetures exceptionnelles, dates, anti-spam, bornes des
champs, plus l'état des garde-fous (trigger d'annulation conditionné, job de
libération planifié, RLS anonyme).

Aucun effet de bord : chaque test s'exécute dans une sous-transaction annulée —
aucune ligne créée, aucun email, aucune notification. Le script s'adapte
automatiquement au restaurant (horaires, nombre de tables), il fonctionne donc
en production comme en staging.

Attendu en fin d'exécution : **✅ TOUT EST VERT**.

## 3. Simulation de trafic — quelques minutes

Compresse des semaines d'usage pour révéler les bugs d'accumulation et de
dérive temporelle (le genre qui produit des « tables fantômes »).

**Uniquement sur le staging.** Le script refuse de tourner sur la production :
il crée de vraies réservations, donc de vrais emails et notifications.

### Mise en place (une fois)

1. **Créer le projet** `cerydra-staging` sur Supabase (région EU).
2. **Schéma** : exécuter `tests/staging/01_bootstrap.sql` dans son SQL Editor.
   Ce fichier est généré depuis le schéma de production **sans les webhooks** —
   le staging ne peut rien envoyer à personne. Pour le régénérer après une
   migration : `python tests/staging/build_bootstrap.py`.
3. **Compte** : lancer l'app en pointant sur le staging et s'inscrire —
   ```bash
   # .env.local (non versionné)
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. **Restaurant de test** : exécuter `tests/staging/02_seed.sql`
   → « Chez Cerydra », 12 tables, ouvert 6 j/7.
5. **Clés du script** — créer `.env.staging` à la racine (déjà ignoré par git) :
   ```
   STAGING_URL=https://xxxx.supabase.co
   STAGING_ANON_KEY=eyJ...
   ```

### Lancer

```bash
npm run simulate          # 14 jours de trafic
npm run simulate -- 30    # 30 jours
```

Le script génère un trafic réaliste (week-ends plus chargés, tailles de groupes
variées, messages clients) et affiche le détail des refus par motif. Ensuite,
ouvrir le dashboard du staging et vérifier : couleurs du plan cohérentes,
créneaux complets bien refusés, aucun refus inattendu, statistiques justes.

## 4. Recette manuelle — 45 minutes

Voir [`docs/RECETTE.md`](../docs/RECETTE.md) : ~90 points à cocher sur de vrais
appareils, à dérouler idéalement à deux (le temps réel et l'ergonomie ne se
testent pas autrement).

## Règle de conduite

Un bug corrigé sans test qui le couvre reviendra. À chaque bug trouvé :
1. on le corrige,
2. **on ajoute le cas dans la suite** (niveau 1 ou 2 selon sa nature),
3. on relance la suite complète.

C'est ce qui fait que la liste des bugs finit par se vider au lieu de se
renouveler.
