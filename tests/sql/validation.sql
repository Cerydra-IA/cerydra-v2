-- ═══════════════════════════════════════════════════════════════════════════
-- CERYDRA — suite de tests des règles de réservation
--
-- À coller dans le SQL Editor Supabase. Aucun effet de bord :
-- chaque test s'exécute dans une sous-transaction annulée → aucune ligne
-- créée, aucun email, aucune notification.
--
-- Le script s'adapte tout seul au restaurant (horaires, nombre de tables),
-- il fonctionne donc aussi bien en production qu'en staging.
-- ═══════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS resultats_tests;
CREATE TEMP TABLE resultats_tests (
  n int, test text, attendu text, obtenu text, verdict text
);

DO $$
DECLARE
  rid uuid;
  nb_tables int;
  jour_cible date;
  h_valide time;      -- créneau du soir valide
  h_tardive time;     -- trop proche de la fermeture (dernière arrivée)
  h_hors time;        -- hors service
  couverts_max int;
  err text;
  i int;
BEGIN
  -- ── Contexte ──────────────────────────────────────────────────────────────
  SELECT id, COALESCE(nb_couverts_max, 20)
    INTO rid, couverts_max
    FROM restaurants ORDER BY created_at LIMIT 1;
  IF rid IS NULL THEN RAISE EXCEPTION 'aucun restaurant en base'; END IF;

  SELECT count(*) INTO nb_tables FROM plan_tables WHERE restaurant_id = rid;

  -- premier samedi dans 7 à 14 jours (hors délai minimum, date valide)
  jour_cible := current_date + ((6 - extract(dow FROM current_date)::int + 7) % 7 + 7);

  SELECT soir_debut,
         soir_fin - interval '30 minutes',
         soir_debut - interval '2 hours'
    INTO h_valide, h_tardive, h_hors
    FROM horaires WHERE restaurant_id = rid AND jour = 'samedi';
  IF h_valide IS NULL THEN RAISE EXCEPTION 'horaires du samedi absents'; END IF;

  -- ── 1. Réservation normale ────────────────────────────────────────────────
  BEGIN
    INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
    VALUES (rid,'Test','Valide','t1@exemple.fr','0600000000',jour_cible,h_valide,2,'confirmée');
    RAISE EXCEPTION '__ok__';
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (1,'Réservation normale','accepté',
      CASE WHEN err='__ok__' THEN 'accepté' ELSE err END,
      CASE WHEN err='__ok__' THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 2. Anti-doublon (3ᵉ résa même email, même jour) ───────────────────────
  BEGIN
    INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
    SELECT rid,'Test','Doublon','doublon@exemple.fr','0600000000',jour_cible,
           h_valide + (n * interval '30 minutes'),2,'confirmée'
      FROM generate_series(0,2) n;
    RAISE EXCEPTION '__ok__';
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (2,'Anti-doublon email','doublon_email',err,
      CASE WHEN err='doublon_email' THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 3. Créneau complet (toutes les tables + 1) ────────────────────────────
  BEGIN
    IF nb_tables = 0 THEN
      INSERT INTO resultats_tests VALUES (3,'Créneau complet','creneau_complet',
        'ignoré (aucune table au plan)','SKIP');
    ELSE
      INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
      SELECT rid,'Test','Capa'||n,'capa'||n||'@exemple.fr','0600000000',jour_cible,h_valide,2,'confirmée'
        FROM generate_series(1,nb_tables) n;
      INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
      VALUES (rid,'Test','Overflow','over@exemple.fr','0600000000',jour_cible,h_valide,2,'confirmée');
      RAISE EXCEPTION '__ok__';
    END IF;
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (3,'Créneau complet','creneau_complet',err,
      CASE WHEN err='creneau_complet' THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 4. Rotation : créneau suivant hors fenêtre → accepté ──────────────────
  BEGIN
    IF nb_tables = 0 THEN
      INSERT INTO resultats_tests VALUES (4,'Rotation créneau suivant','accepté','ignoré','SKIP');
    ELSE
      INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
      SELECT rid,'Test','Rot'||n,'rot'||n||'@exemple.fr','0600000000',jour_cible,h_valide,2,'confirmée'
        FROM generate_series(1,nb_tables) n;
      INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
      VALUES (rid,'Test','Apres','apres@exemple.fr','0600000000',jour_cible,
              h_valide + interval '90 minutes',2,'confirmée');
      RAISE EXCEPTION '__ok__';
    END IF;
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (4,'Rotation créneau suivant','accepté',
      CASE WHEN err='__ok__' THEN 'accepté' ELSE err END,
      CASE WHEN err IN ('__ok__') THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 5. Heure hors service ─────────────────────────────────────────────────
  BEGIN
    INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
    VALUES (rid,'Test','Hors','hors@exemple.fr','0600000000',jour_cible,h_hors,2,'confirmée');
    RAISE EXCEPTION '__ok__';
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (5,'Heure hors service','heure_hors_creneaux',err,
      CASE WHEN err='heure_hors_creneaux' THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 6. Dernière arrivée (trop proche de la fermeture) ─────────────────────
  BEGIN
    INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
    VALUES (rid,'Test','Tardive','tardive@exemple.fr','0600000000',jour_cible,h_tardive,2,'confirmée');
    RAISE EXCEPTION '__ok__';
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (6,'Dernière arrivée','heure_hors_creneaux',err,
      CASE WHEN err='heure_hors_creneaux' THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 7. Date passée ────────────────────────────────────────────────────────
  BEGIN
    INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
    VALUES (rid,'Test','Passe','passe@exemple.fr','0600000000',current_date-7,h_valide,2,'confirmée');
    RAISE EXCEPTION '__ok__';
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (7,'Date passée','date_invalide',err,
      CASE WHEN err='date_invalide' THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 8. Date à plus d'un an ────────────────────────────────────────────────
  BEGIN
    INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
    VALUES (rid,'Test','Loin','loin@exemple.fr','0600000000',current_date+400,h_valide,2,'confirmée');
    RAISE EXCEPTION '__ok__';
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (8,'Date > 1 an','date_invalide',err,
      CASE WHEN err='date_invalide' THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 9. Délai minimum non respecté ─────────────────────────────────────────
  BEGIN
    INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
    VALUES (rid,'Test','Presse','presse@exemple.fr','0600000000',current_date,
            ((now() AT TIME ZONE 'Europe/Paris') + interval '20 minutes')::time,2,'confirmée');
    RAISE EXCEPTION '__ok__';
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (9,'Délai minimum',
      'delai_minimum_non_respecte / restaurant_ferme / heure_hors_creneaux',err,
      CASE WHEN err IN ('delai_minimum_non_respecte','restaurant_ferme','heure_hors_creneaux')
           THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 10. Fermeture exceptionnelle ──────────────────────────────────────────
  BEGIN
    INSERT INTO fermetures(restaurant_id, date, motif) VALUES (rid, jour_cible, 'test');
    INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
    VALUES (rid,'Test','Ferme','ferme@exemple.fr','0600000000',jour_cible,h_valide,2,'confirmée');
    RAISE EXCEPTION '__ok__';
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (10,'Fermeture exceptionnelle','restaurant_ferme',err,
      CASE WHEN err='restaurant_ferme' THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 11. Nombre de personnes hors limite ───────────────────────────────────
  BEGIN
    INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
    VALUES (rid,'Test','Groupe','groupe@exemple.fr','0600000000',jour_cible,h_valide,couverts_max+50,'confirmée');
    RAISE EXCEPTION '__ok__';
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (11,'nb_personnes hors limite','nb_personnes_invalide',err,
      CASE WHEN err='nb_personnes_invalide' THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 12. Email invalide ────────────────────────────────────────────────────
  BEGIN
    INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
    VALUES (rid,'Test','Mail','pas-un-email','0600000000',jour_cible,h_valide,2,'confirmée');
    RAISE EXCEPTION '__ok__';
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (12,'Email invalide','email_invalide',err,
      CASE WHEN err='email_invalide' THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 13. Prénom vide ───────────────────────────────────────────────────────
  BEGIN
    INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
    VALUES (rid,'   ','Vide','vide@exemple.fr','0600000000',jour_cible,h_valide,2,'confirmée');
    RAISE EXCEPTION '__ok__';
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (13,'Prénom vide','prenom_invalide',err,
      CASE WHEN err='prenom_invalide' THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 14. Message trop long ─────────────────────────────────────────────────
  BEGIN
    INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut,message)
    VALUES (rid,'Test','Msg','msg@exemple.fr','0600000000',jour_cible,h_valide,2,'confirmée',repeat('a',1200));
    RAISE EXCEPTION '__ok__';
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (14,'Message > 1000 caractères','message_trop_long',err,
      CASE WHEN err='message_trop_long' THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 15. Restaurant inexistant ─────────────────────────────────────────────
  BEGIN
    INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
    VALUES (gen_random_uuid(),'Test','Fantome','fantome@exemple.fr','0600000000',jour_cible,h_valide,2,'confirmée');
    RAISE EXCEPTION '__ok__';
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (15,'Restaurant inexistant','restaurant_inconnu',err,
      CASE WHEN err LIKE '%restaurant_inconnu%' OR err LIKE '%foreign key%' THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 16. Anti-spam (au-delà de 10 créations / 10 min) ──────────────────────
  BEGIN
    INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
    SELECT rid,'Test','Spam'||n,'spam'||n||'@exemple.fr','0600000000',
           jour_cible + (n / 2), h_valide + ((n % 2) * interval '90 minutes'),2,'confirmée'
      FROM generate_series(1,11) n;
    RAISE EXCEPTION '__ok__';
  EXCEPTION WHEN others THEN err := SQLERRM;
    INSERT INTO resultats_tests VALUES (16,'Anti-spam 10/10 min','trop_de_reservations',err,
      CASE WHEN err='trop_de_reservations' THEN 'PASS' ELSE 'FAIL' END);
  END;

  -- ── 17. La fonction de disponibilité répond ───────────────────────────────
  BEGIN
    IF (creneau_disponibilite(rid, jour_cible, h_valide)->>'tables_total') IS NULL THEN
      INSERT INTO resultats_tests VALUES (17,'creneau_disponibilite()','compteurs','réponse vide','FAIL');
    ELSE
      INSERT INTO resultats_tests VALUES (17,'creneau_disponibilite()','compteurs',
        creneau_disponibilite(rid, jour_cible, h_valide)::text,'PASS');
    END IF;
  EXCEPTION WHEN others THEN
    INSERT INTO resultats_tests VALUES (17,'creneau_disponibilite()','compteurs',SQLERRM,'FAIL');
  END;

  -- ── 18. Trigger d'annulation conditionné ──────────────────────────────────
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgname = 'annulation_reservation'
         AND pg_get_triggerdef(oid) LIKE '%WHEN%annulée%'
    ) THEN
      INSERT INTO resultats_tests VALUES (18,'Webhook annulation conditionné','WHEN statut=annulée','présent','PASS');
    ELSE
      INSERT INTO resultats_tests VALUES (18,'Webhook annulation conditionné','WHEN statut=annulée','absent','FAIL');
    END IF;
  END;

  -- ── 19. Job de libération des tables planifié ─────────────────────────────
  BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='liberer-tables-expirees' AND active) THEN
      INSERT INTO resultats_tests VALUES (19,'Cron libération tables','actif','actif','PASS');
    ELSE
      INSERT INTO resultats_tests VALUES (19,'Cron libération tables','actif','absent/inactif','FAIL');
    END IF;
  END;

  -- ── 20. Les anonymes ne lisent pas les réservations ───────────────────────
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_policies
       WHERE schemaname='public' AND tablename='reservations'
         AND cmd='SELECT' AND 'anon' = ANY(roles)
    ) THEN
      INSERT INTO resultats_tests VALUES (20,'RLS : anon ne lit pas les résas','aucune policy SELECT anon','policy trouvée','FAIL');
    ELSE
      INSERT INTO resultats_tests VALUES (20,'RLS : anon ne lit pas les résas','aucune policy SELECT anon','conforme','PASS');
    END IF;
  END;
END $$;

-- ═══ Résultats ═══
SELECT * FROM resultats_tests ORDER BY n;

SELECT
  count(*) FILTER (WHERE verdict='PASS') AS reussis,
  count(*) FILTER (WHERE verdict='FAIL') AS echecs,
  count(*) FILTER (WHERE verdict='SKIP') AS ignores,
  CASE WHEN count(*) FILTER (WHERE verdict='FAIL') = 0
       THEN '✅ TOUT EST VERT' ELSE '❌ VOIR LES ÉCHECS CI-DESSUS' END AS bilan
FROM resultats_tests;
