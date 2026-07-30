# Tests CERYDRA

Trois niveaux, du plus rapide au plus complet. À faire **dans cet ordre** avant
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

## 3. Recette manuelle — 45 minutes

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
