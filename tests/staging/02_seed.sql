-- ═══════════════════════════════════════════════════════════════════════════
-- CERYDRA — restaurant de test pour le staging
--
-- ⚠️  Projet **cerydra-staging** uniquement, après 01_bootstrap.sql.
--
-- Prérequis : avoir créé un compte sur l'app pointée vers le staging
-- (page Inscription). Le script rattache le restaurant au premier compte
-- trouvé.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  uid uuid;
  rid uuid;
  n int;
BEGIN
  SELECT id INTO uid FROM auth.users ORDER BY created_at LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Aucun compte : inscris-toi d''abord sur l''app pointée vers le staging.';
  END IF;

  -- ── Restaurant ───────────────────────────────────────────────────────────
  DELETE FROM restaurants WHERE slug = 'chez-cerydra';

  INSERT INTO restaurants (
    user_id, nom, slug, adresse, telephone, description,
    nb_tables, nb_couverts_max, delai_minimum_heures, duree_occupation_minutes,
    message_confirmation
  ) VALUES (
    uid, 'Chez Cerydra', 'chez-cerydra', '1 rue des Tests, 13001 Marseille',
    '04 91 00 00 00', 'Restaurant fictif servant aux tests.',
    '12', '8', 2, 90,
    'Merci pour votre réservation ! (restaurant de test)'
  ) RETURNING id INTO rid;

  -- ── Horaires : fermé le lundi, midi 12h-14h30, soir 19h-22h30 ────────────
  INSERT INTO horaires (restaurant_id, jour, ouvert, midi_debut, midi_fin, soir_debut, soir_fin)
  SELECT rid, j, j <> 'lundi', '12:00', '14:30', '19:00', '22:30'
    FROM unnest(ARRAY['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']) j;

  -- ── Plan de salle : 8 tables en salle, 4 en terrasse ─────────────────────
  FOR n IN 1..8 LOOP
    INSERT INTO plan_tables (restaurant_id, name, capacity, shape, zone, x_pct, y_pct, duration_minutes)
    VALUES (rid, 'T' || n,
            CASE WHEN n <= 4 THEN 2 WHEN n <= 7 THEN 4 ELSE 6 END,
            CASE WHEN n % 2 = 0 THEN 'round' ELSE 'square' END,
            'salle',
            15 + ((n - 1) % 4) * 22,
            25 + ((n - 1) / 4) * 30,
            90);
  END LOOP;

  FOR n IN 1..4 LOOP
    INSERT INTO plan_tables (restaurant_id, name, capacity, shape, zone, x_pct, y_pct, duration_minutes)
    VALUES (rid, 'E' || n, 4, 'round', 'terrasse', 20 + (n - 1) * 20, 40, 90);
  END LOOP;

  RAISE NOTICE 'Restaurant de test créé : % (slug chez-cerydra, 12 tables)', rid;
END $$;

SELECT r.nom, r.slug, r.duree_occupation_minutes,
       (SELECT count(*) FROM plan_tables p WHERE p.restaurant_id = r.id) AS tables,
       (SELECT count(*) FROM horaires h WHERE h.restaurant_id = r.id AND h.ouvert) AS jours_ouverts
  FROM restaurants r WHERE r.slug = 'chez-cerydra';
