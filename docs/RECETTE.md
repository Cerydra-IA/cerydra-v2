# Fiche de recette CERYDRA

À dérouler **avant chaque installation client** et après toute modification importante.
Idéalement à deux (toi + ton associé), sur de vrais appareils, en même temps :
c'est le seul moyen de tester le temps réel et de repérer les problèmes d'ergonomie.

Comptez 45 min à deux. Notez tout ce qui accroche, même « juste un détail ».

---

## 0. Avant de commencer

- [ ] `npm test` → 20/20 vert
- [ ] `tests/sql/validation.sql` collé dans le SQL Editor → bilan « ✅ TOUT EST VERT »
- [ ] Le déploiement Netlify du dernier commit est bien **Published** (pas Failed)
- [ ] Dans Make : les 4 scénarios sont **actifs**, quota d'opérations pas à sec

## 1. Parcours client (widget)

Sur **mobile réel**, depuis le site du restaurant :

- [ ] Le bouton « Réserver » apparaît en bas à droite
- [ ] La modale s'ouvre, le nom du restaurant est correct
- [ ] Choisir une date : les créneaux proposés correspondent aux horaires du jour
- [ ] Aucun créneau proposé dans la dernière heure avant la fermeture
- [ ] Choisir un **jour de fermeture** → message « Le restaurant est fermé ce jour-là »
- [ ] Ajouter une **fermeture exceptionnelle** dans la Configuration → cette date ne propose plus rien
- [ ] Réserver avec un vrai email → écran de confirmation avec le bon récapitulatif
- [ ] **Email de confirmation** reçu en moins de 2 min, date et heure au bon format
- [ ] Vérifier l'email dans **Gmail ET Outlook/Orange** (pas en spam)
- [ ] Le logo Cerydra s'affiche comme avatar de l'expéditeur
- [ ] Retenter la **même réservation 3 fois** → refus « vous avez déjà une réservation »
- [ ] Depuis un ordinateur, tester aussi la page publique `/resto/<slug>`

## 2. Côté restaurateur — réception

- [ ] **Notification push** reçue sur le téléphone, app fermée
- [ ] La notification affiche nom, date, heure, nombre de couverts
- [ ] Taper la notification → ouvre bien l'onglet Réservations
- [ ] La réservation apparaît en **Confirmée** (confirmation instantanée)
- [ ] Elle apparaît dans le bandeau « à placer » du plan de salle
- [ ] Vérifier la **Google Sheet** et le **Google Calendar** (si conservés)

## 3. Réservations

- [ ] Filtres « Toutes / À venir / Passées » : les compteurs sont justes
- [ ] **Annuler** une réservation → statut Annulée, la table se libère
- [ ] **Supprimer** : premier tap → « Confirmer ? », second tap → supprimée
- [ ] Tester la suppression **depuis la PWA installée sur iPhone** (pas juste Safari)
- [ ] **Exporter CSV** → le fichier s'ouvre dans Excel, accents corrects
- [ ] **+ Nouvelle réservation** (téléphone) : sans email → acceptée
- [ ] L'indicateur d'occupation du créneau s'affiche (« X tables disponibles »)
- [ ] Remplir le créneau, puis retenter → avertissement « créneau complet », mais
      l'enregistrement reste possible
- [ ] Une résa manuelle **avec** email déclenche bien la confirmation
- [ ] Une résa manuelle **sans** email ne fait pas planter le scénario Make

## 4. Plan de salle

- [ ] Mode **Configurer** : déplacer une table, la position est mémorisée après rechargement
- [ ] Double-clic sur une table → édition (nom, capacité, forme, durée)
- [ ] Ajouter/supprimer une table ; changer de zone (Salle / Terrasse)
- [ ] **Placer une réservation** : tap sur le bandeau → tap sur la table → valider
- [ ] La table affiche le nom du client et l'heure
- [ ] Une résa de **demain** ne colore pas la table aujourd'hui
- [ ] Une résa dans **plus de 2 h** laisse la table verte (heure affichée en petit)
- [ ] Une résa dans **moins de 2 h** passe la table en jaune
- [ ] **Walk-in** : tap table libre → « Client sans réservation » → valider **sans nom** → « Sans nom »
- [ ] Passer une table en **Occupée** → rouge, heure de début affichée
- [ ] Repasser en **Libre** → verte, informations effacées
- [ ] **Bloquée** → grise, et elle le reste (aucune libération automatique)
- [ ] Les compteurs du bandeau (libres / réservées / occupées) sont justes
- [ ] **Temps réel** : sur un 2ᵉ appareil connecté, le changement apparaît sans recharger
- [ ] Laisser une table occupée et revenir plus tard → libérée automatiquement
      (durée + 15 min)

## 5. Annulation par le client

- [ ] Cliquer le lien d'annulation d'un email → page « Annuler votre réservation ? »
- [ ] « Non, je garde ma table » → retour à l'accueil, **réservation intacte**
- [ ] « Oui, annuler » → confirmation, statut Annulée dans le dashboard
- [ ] **Email d'annulation** reçu, dates au bon format
- [ ] Recliquer le même lien → « déjà annulée » (usage unique)
- [ ] La table libérée est de nouveau réservable en ligne

## 6. Emails automatiques (à vérifier le lendemain, ou via webhook manuel)

- [ ] **Rappel J-1** reçu, avec le lien d'annulation fonctionnel
- [ ] **Aucun email d'annulation** ne part en même temps que le rappel ⚠️ (ancien bug)
- [ ] **Demande d'avis** reçue le lendemain de la visite, lien Google correct

## 7. Configuration

- [ ] Modifier les horaires → les créneaux du widget suivent
- [ ] Modifier « durée d'occupation » → l'occupation du plan et la capacité suivent
- [ ] Modifier le délai minimum → le widget refuse les créneaux trop proches
- [ ] Ajouter puis retirer une fermeture exceptionnelle
- [ ] Personnaliser les couleurs du widget → visible sur le site
- [ ] Statistiques : les chiffres correspondent aux réservations réelles

## 8. Installation et robustesse

- [ ] Installer la PWA sur iPhone (guide, page 3) → icône Cerydra sur l'écran d'accueil
- [ ] Accepter les notifications au premier lancement
- [ ] Ouvrir depuis l'icône (pas Safari) → aucune barre d'adresse
- [ ] Lien « Aide » → le guide PDF s'ouvre
- [ ] Se déconnecter / reconnecter
- [ ] Tester en **4G** (pas seulement en Wi-Fi)
- [ ] Mode avion pendant une action → pas d'écran blanc, message compréhensible
- [ ] Tester sur **Android** si un client en a un

## 9. Sécurité

- [ ] Déconnecté, ouvrir `/dashboard/reservations` → redirigé vers la connexion
- [ ] Dans le SQL Editor : `set role anon; select * from reservations limit 1; reset role;`
      → **0 ligne**
- [ ] `/admin` avec un compte non-admin → refusé

---

## Journal des recettes

| Date | Version (commit) | Par | Résultat / anomalies |
|---|---|---|---|
| | | | |
