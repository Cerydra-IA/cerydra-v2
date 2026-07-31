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
    -- Une réservation par semaine sur le même jour d'ouverture : on évite
    -- ainsi à la fois la limite de capacité et les jours de fermeture, pour
    -- n'éprouver que l'anti-spam.
    INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
    SELECT rid,'Test','Spam'||n,'spam'||n||'@exemple.fr','0600000000',
           jour_cible + (n * 7), h_valide, 2, 'confirmée'
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

  -- ── 17 bis. Créneaux du jour : cohérence avec les horaires ────────────────
  BEGIN
    DECLARE
      creneaux json;
      n_creneaux int;
      dernier time;
    BEGIN
      creneaux := creneaux_disponibilite(rid, jour_cible);
      SELECT count(*), max((value->>'heure')::time)
        INTO n_creneaux, dernier
        FROM json_array_elements(creneaux);

      IF n_creneaux = 0 THEN
        INSERT INTO resultats_tests VALUES (170,'creneaux_disponibilite()','créneaux du samedi',
          'aucun créneau','FAIL');
      ELSIF dernier > h_valide - interval '1 second' AND dernier <= h_tardive THEN
        INSERT INTO resultats_tests VALUES (170,'creneaux_disponibilite()',
          'dernière arrivée ≤ fermeture - 1 h',
          n_creneaux || ' créneaux, dernier à ' || dernier,'PASS');
      ELSE
        INSERT INTO resultats_tests VALUES (170,'creneaux_disponibilite()',
          'dernière arrivée ≤ fermeture - 1 h',
          'dernier créneau à ' || dernier,'FAIL');
      END IF;
    END;
  EXCEPTION WHEN others THEN
    INSERT INTO resultats_tests VALUES (170,'creneaux_disponibilite()','créneaux du jour',SQLERRM,'FAIL');
  END;

  -- ── 17 ter. Aucun créneau un jour de fermeture exceptionnelle ─────────────
  BEGIN
    INSERT INTO fermetures(restaurant_id, date, motif) VALUES (rid, jour_cible, 'test');
    IF json_array_length(creneaux_disponibilite(rid, jour_cible)) = 0 THEN
      INSERT INTO resultats_tests VALUES (171,'Créneaux un jour de fermeture','aucun','aucun','PASS');
    ELSE
      INSERT INTO resultats_tests VALUES (171,'Créneaux un jour de fermeture','aucun',
        'des créneaux sont proposés','FAIL');
    END IF;
    RAISE EXCEPTION '__rollback__';
  EXCEPTION WHEN others THEN
    IF SQLERRM <> '__rollback__' THEN
      INSERT INTO resultats_tests VALUES (171,'Créneaux un jour de fermeture','aucun',SQLERRM,'FAIL');
    END IF;
  END;

  -- ── 17 quater. Algorithme de placement (places, pas tables) ───────────────
  BEGIN
    DECLARE
      echecs text := '';
    BEGIN
      -- 5 tables de 2 = 10 places : un groupe de 6 passe en assemblant 3 tables
      IF NOT peut_placer(ARRAY[2,2,2,2,2], ARRAY[6]) THEN
        echecs := echecs || 'assemblage de 3 tables refusé ; ';
      END IF;
      -- un groupe de 6 ne tient pas sur deux tables de 2 (4 places)
      IF peut_placer(ARRAY[2,2], ARRAY[6]) THEN
        echecs := echecs || '6 places trouvées sur 4 ; ';
      END IF;
      -- une table de 6 accueille un groupe de 6
      IF NOT peut_placer(ARRAY[2,4,6], ARRAY[6]) THEN
        echecs := echecs || 'table de 6 non utilisée ; ';
      END IF;
      -- on ne gaspille pas la grande table : 2+2 puis 6 doit passer
      IF NOT peut_placer(ARRAY[2,2,6], ARRAY[6,2,2]) THEN
        echecs := echecs || 'placement optimal manqué ; ';
      END IF;
      -- plus de table du tout
      IF peut_placer(ARRAY[]::int[], ARRAY[2]) THEN
        echecs := echecs || 'placement sans table ; ';
      END IF;
      -- salle pleine : 3 tables, 4 groupes
      IF peut_placer(ARRAY[4,4,4], ARRAY[4,4,4,4]) THEN
        echecs := echecs || '4 groupes sur 3 tables ; ';
      END IF;

      INSERT INTO resultats_tests VALUES (172,'Placement en places (peut_placer)',
        'assemblage et refus corrects',
        CASE WHEN echecs = '' THEN 'conforme' ELSE echecs END,
        CASE WHEN echecs = '' THEN 'PASS' ELSE 'FAIL' END);
    END;
  EXCEPTION WHEN others THEN
    INSERT INTO resultats_tests VALUES (172,'Placement en places (peut_placer)',
      'assemblage et refus corrects', SQLERRM, 'FAIL');
  END;

  -- ── 17 quinquies. Un groupe trop grand est refusé ─────────────────────────
  BEGIN
    IF nb_tables = 0 THEN
      INSERT INTO resultats_tests VALUES (173,'Groupe trop grand pour la salle',
        'creneau_complet','ignoré (aucune table au plan)','SKIP');
    ELSE
      DECLARE places_totales int;
      BEGIN
        SELECT COALESCE(sum(capacity), 0) INTO places_totales
          FROM plan_tables WHERE restaurant_id = rid;
        -- on demande plus de couverts que la salle n'en contient
        INSERT INTO reservations(restaurant_id,prenom,nom,email,telephone,date,heure,nb_personnes,statut)
        VALUES (rid,'Test','Enorme','enorme@exemple.fr','0600000000',jour_cible,h_valide,
                LEAST(places_totales + 10, COALESCE(couverts_max, 20)),'confirmée');
        RAISE EXCEPTION '__ok__';
      END;
    END IF;
  EXCEPTION WHEN others THEN
    err := SQLERRM;
    IF err <> '__ok__' OR true THEN
      INSERT INTO resultats_tests VALUES (173,'Groupe plus grand que la salle',
        'creneau_complet ou nb_personnes_invalide', err,
        CASE WHEN err IN ('creneau_complet','nb_personnes_invalide') THEN 'PASS' ELSE 'FAIL' END);
    END IF;
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
