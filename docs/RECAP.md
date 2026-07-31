# CERYDRA — Récapitulatif du projet

> Document de survie : tout ce qu'il faut savoir pour reprendre, reconstruire ou répliquer le projet.
> Mis à jour le 3 juillet 2026.

## 1. Vue d'ensemble

CERYDRA = système de réservation pour restaurants :
- **Widget** intégrable sur le site du restaurant (`<script src="https://app.cerydra.fr/widget.js" data-resto="slug">`)
- **Dashboard** restaurateur (PWA installable) : réservations, plan de salle, statistiques, configuration
- **Automatisations** : emails (confirmation, rappel J-1, avis Google, annulation), notifications push, Google Sheet/Calendar

## 2. Les services et où tout vit

| Quoi | Où | Compte |
|---|---|---|
| Code source | GitHub `Cerydra-IA/cerydra-v2` | compte GitHub perso |
| App + widget (`app.cerydra.fr`) | Netlify (déploiement auto sur push `main`) | compte Netlify |
| Base de données, auth, Edge Functions | Supabase, projet `wuyltmbakpcvimqspqnb` | contact@cerydra.fr |
| Emails automatiques | Make.com — scénarios : Cerydra Reservation, Cerydra Annulation, Rappel, Post-Visite | compte Make |
| Envoi des emails | Gmail Google Workspace `contact@cerydra.fr` | admin Workspace |
| Site démo Le Comptoir | Netlify `lecomptoir13.netlify.app` (source : `Desktop/CERYDRA/lecomptoir`) | compte Netlify |
| Domaines `cerydra.fr` / `app.cerydra.fr` | registrar + DNS (voir compte registrar) | — |

## 3. Architecture des flux

```
Client → widget.js → INSERT reservations (Supabase, validation par trigger)
                        ├─ trigger nouvelle_reservation → webhook Make → GPT → Gmail (confirmation) + Sheet + Calendar
                        ├─ trigger on-new-reservation → Edge Function send-push → notif push restaurateur
                        └─ statut 'confirmée' d'office (confirmation instantanée)

pg_cron (toutes les heures)
   ├─ send-reminders   → résas J+1 (fenêtre 22-26h) → webhook Make → email rappel + lien annulation
   └─ send-post-visit  → résas J-1 confirmées      → webhook Make → email demande d'avis Google

Client clique lien annulation → page /annuler/:token → confirmation → RPC annuler_reservation
                        └─ trigger annulation_reservation → webhook Make → Gmail + suppression Calendar
```

## 4. Règles métier (trigger `validate_reservation`, sur INSERT reservations)

Pour le public (widget / page publique) :
- date future, max 1 an ; délai minimum configurable (`delai_minimum_heures`, défaut 2h)
- horaires d'ouverture + fermetures exceptionnelles (table `fermetures`) + dernière arrivée 1h avant la fin du service
- anti-doublon : max 2 résas actives / email / jour / resto
- capacité : une résa occupe une table pendant `duree_occupation_minutes` (défaut 90, configurable) ;
  refus si toutes les tables (plan de salle, repli `nb_tables`) sont prises sur la fenêtre glissante ;
  les walk-ins (tables occupées sans résa) comptent pour le service en cours
- anti-spam : max 10 créations / 10 min / resto
- champs bornés (email regex, nb_personnes ≤ nb_couverts_max, message ≤ 1000 car.)

Le restaurateur connecté (résa manuelle) est exempté des règles business, email facultatif.

## 5. Sécurité / comptes sensibles

- **Admin** : contact@cerydra.fr uniquement — UUID `e46a1351-987d-411f-8b8c-1ab91ee2f09f` (policies RLS admin)
- **RLS** : anonymes = INSERT reservations + SELECT restaurants/horaires/fermetures uniquement (pas de lecture des résas)
- **Secrets** (⚠️ jamais dans git — sauvegardés hors repo) :
  - `.env` local : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Supabase → Edge Functions Secrets : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
    `MAKE_REMINDER_WEBHOOK_URL`, `MAKE_POST_VISIT_WEBHOOK_URL`
  - service_role key : Supabase → Settings → API (utilisée par le webhook `on-new-reservation`)
  - URLs webhooks Make (rappel, avis, réservation, annulation)
  - Clé VAPID publique aussi en dur dans `src/hooks/usePushNotifications.js`

## 6. SQL — reconstruire la base

- `supabase/migrations/` : migrations versionnées (validation, capacité, fermetures, cron, RLS admin…)
- `supabase/schema_complet.sql` : **dump complet du schéma réel** (tables, triggers, fonctions, policies) — à regénérer
  périodiquement (voir §8)
- Webhooks base → Make/Edge Functions : configurés dans le Dashboard Supabase (Integrations → Database Webhooks),
  et triggers `nouvelle_reservation` / `annulation_reservation` / `on-new-reservation` (dans le dump)
- pg_cron : jobs `send-reminders-hourly` et équivalent post-visit (`select * from cron.job;`)

## 7. Outils du repo

- `tools/generer_guide.py` : regénère le guide PDF (captures dans `tools/`) → publier dans `public/guide-utilisation.pdf`
- `tools/capture_assets.mjs` : captures Playwright du site démo + widget (assets vidéo)
- `video/` : projet Remotion — compositions `CerydraLong` (90s) et `CerydraShort` (30s vertical) ;
  `cd video && npx remotion studio` pour prévisualiser, `npx remotion render <compo> out/x.mp4`

## 8. Plan de sauvegarde (règle 3-2-1 : 3 copies, 2 supports, 1 hors site)

| Donnée | Copie 1 | Copie 2 | Copie 3 |
|---|---|---|---|
| Code | PC | GitHub ✅ | clé USB (zip du dossier CERYDRA) |
| Schéma SQL | repo (`schema_complet.sql`) ✅ | GitHub ✅ | clé USB |
| **Données clients** (réservations…) | Supabase | export mensuel CSV/SQL → repo privé ou USB | — |
| Secrets (.env, clés, webhooks) | PC | gestionnaire de mots de passe (recommandé) | clé USB |
| Scénarios Make | Make.com | **export blueprints JSON** → `docs/make-blueprints/` | clé USB |
| Fichiers commerciaux (vidéos, PDF, présentation) | PC | Google Drive | clé USB |

Rituel mensuel (15 min) : exporter les données (`Table Editor → Export CSV` ou dump), re-exporter les blueprints Make
si modifiés, recopier le zip CERYDRA sur la clé USB.

## 9. Points de vigilance connus

- Supabase **free tier** : pas de restauration automatique (d'où les exports), pause après 7 jours d'inactivité
- Make : surveiller le quota d'opérations ; notifications d'erreur activées ; module Gmail AVANT Calendar
  dans le scénario Annulation ; filtre "email non vide" pour les résas manuelles sans email
- Push iOS : nécessite la PWA installée + permission ; indicateur d'état à ajouter un jour
- Créneaux complets et trop proches : grisés dans le widget et la page publique (creneaux_disponibilite)
