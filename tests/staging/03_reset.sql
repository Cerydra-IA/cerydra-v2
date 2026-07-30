-- ═══════════════════════════════════════════════════════════════════════════
-- CERYDRA — remise à zéro des données du staging
--
-- ⚠️  Projet **cerydra-staging** uniquement. Efface toutes les réservations
--     et assignations de tables ; conserve le restaurant, ses horaires et son
--     plan de salle.
--
-- À lancer avant chaque `npm run simulate` : sans cela, les réservations
-- créées à l'instant maintiennent le seuil anti-spam (10 créations / 10 min)
-- et toutes les nouvelles sont refusées.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE rid uuid; n_resa int; n_assign int;
BEGIN
  SELECT id INTO rid FROM restaurants WHERE slug = 'chez-cerydra';
  IF rid IS NULL THEN
    RAISE EXCEPTION 'Restaurant de test introuvable — lance 02_seed.sql';
  END IF;

  SELECT count(*) INTO n_assign FROM table_assignments WHERE restaurant_id = rid;
  DELETE FROM table_assignments WHERE restaurant_id = rid;

  SELECT count(*) INTO n_resa FROM reservations WHERE restaurant_id = rid;
  DELETE FROM reservations WHERE restaurant_id = rid;

  DELETE FROM fermetures WHERE restaurant_id = rid;

  RAISE NOTICE '% réservations et % assignations supprimées', n_resa, n_assign;
END $$;

SELECT
  (SELECT count(*) FROM reservations r
     JOIN restaurants s ON s.id = r.restaurant_id WHERE s.slug = 'chez-cerydra') AS reservations,
  (SELECT count(*) FROM table_assignments a
     JOIN restaurants s ON s.id = a.restaurant_id WHERE s.slug = 'chez-cerydra') AS assignations,
  (SELECT count(*) FROM plan_tables p
     JOIN restaurants s ON s.id = p.restaurant_id WHERE s.slug = 'chez-cerydra') AS tables_conservees;
