-- Capacité par créneau basée sur le plan de salle
-- Remplace l'ancien trigger_check_doublon (formule de capacité incorrecte :
-- nb_tables * nb_couverts_max, créneau exact, résas en attente ignorées).
-- Principe : une réservation occupe une table pendant duree_occupation_minutes
-- (défaut 90, configurable par restaurant). Une nouvelle réservation est refusée
-- si toutes les tables sont occupées sur la fenêtre qui chevauche son horaire.
-- Source de vérité du nombre de tables : le plan de salle (plan_tables),
-- avec repli sur restaurants.nb_tables si le plan est vide.

-- 1. Durée d'occupation configurable
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS duree_occupation_minutes integer DEFAULT 90;

-- 2. Suppression de l'ancien trigger et de sa fonction
DROP TRIGGER IF EXISTS trigger_check_doublon ON reservations;
DROP FUNCTION IF EXISTS check_reservation_doublon();

-- 3. Fonction de validation complète (remplace la version du 02/07)
CREATE OR REPLACE FUNCTION validate_reservation()
RETURNS trigger AS $$
DECLARE
  resto record;
  jour_nom text;
  h record;
  recent_count int;
  same_email_count int;
  duree int;
  nb_tables_total int;
  tables_occupees int;
BEGIN
  -- Restaurant existant
  SELECT * INTO resto FROM restaurants WHERE id = NEW.restaurant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'restaurant_inconnu';
  END IF;

  -- Champs obligatoires et bornés
  IF NEW.prenom IS NULL OR length(trim(NEW.prenom)) < 1 OR length(NEW.prenom) > 100 THEN
    RAISE EXCEPTION 'prenom_invalide';
  END IF;
  IF NEW.nom IS NULL OR length(trim(NEW.nom)) < 1 OR length(NEW.nom) > 100 THEN
    RAISE EXCEPTION 'nom_invalide';
  END IF;
  IF NEW.email IS NULL OR NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(NEW.email) > 255 THEN
    RAISE EXCEPTION 'email_invalide';
  END IF;
  IF NEW.message IS NOT NULL AND length(NEW.message) > 1000 THEN
    RAISE EXCEPTION 'message_trop_long';
  END IF;

  -- Nombre de personnes borné par la config du restaurant
  IF NEW.nb_personnes IS NULL OR NEW.nb_personnes < 1
     OR NEW.nb_personnes > COALESCE(resto.nb_couverts_max, 20) THEN
    RAISE EXCEPTION 'nb_personnes_invalide';
  END IF;

  -- Date : pas dans le passé, pas à plus d'un an
  IF NEW.date IS NULL OR NEW.date < CURRENT_DATE OR NEW.date > CURRENT_DATE + INTERVAL '1 year' THEN
    RAISE EXCEPTION 'date_invalide';
  END IF;

  -- Délai minimum de réservation (heures, config restaurant)
  IF (NEW.date::timestamp + NEW.heure)
     < (now() AT TIME ZONE 'Europe/Paris') + make_interval(hours => COALESCE(resto.delai_minimum_heures, 2)) THEN
    RAISE EXCEPTION 'delai_minimum_non_respecte';
  END IF;

  -- Heure dans les créneaux d'ouverture du jour
  jour_nom := CASE extract(dow FROM NEW.date)
    WHEN 0 THEN 'dimanche' WHEN 1 THEN 'lundi' WHEN 2 THEN 'mardi'
    WHEN 3 THEN 'mercredi' WHEN 4 THEN 'jeudi' WHEN 5 THEN 'vendredi'
    WHEN 6 THEN 'samedi' END;

  SELECT * INTO h FROM horaires
    WHERE restaurant_id = NEW.restaurant_id AND jour = jour_nom;
  IF NOT FOUND OR NOT h.ouvert THEN
    RAISE EXCEPTION 'restaurant_ferme';
  END IF;
  IF NOT (
    (NEW.heure >= h.midi_debut AND NEW.heure < h.midi_fin) OR
    (NEW.heure >= h.soir_debut AND NEW.heure < h.soir_fin)
  ) THEN
    RAISE EXCEPTION 'heure_hors_creneaux';
  END IF;

  -- Anti-doublon : même email, même resto, même date
  SELECT count(*) INTO same_email_count FROM reservations
    WHERE restaurant_id = NEW.restaurant_id
      AND email = NEW.email
      AND date = NEW.date
      AND statut <> 'annulée';
  IF same_email_count >= 2 THEN
    RAISE EXCEPTION 'doublon_email';
  END IF;

  -- Capacité : une résa occupe une table pendant duree_occupation_minutes.
  -- Refus si toutes les tables sont prises sur la fenêtre chevauchante.
  duree := COALESCE(resto.duree_occupation_minutes, 90);

  SELECT count(*) INTO nb_tables_total FROM plan_tables
    WHERE restaurant_id = NEW.restaurant_id;
  IF nb_tables_total = 0 THEN
    nb_tables_total := COALESCE(NULLIF(resto.nb_tables::text, '')::int, 0);
  END IF;

  IF nb_tables_total > 0 THEN
    SELECT count(*) INTO tables_occupees FROM reservations
      WHERE restaurant_id = NEW.restaurant_id
        AND date = NEW.date
        AND statut <> 'annulée'
        AND heure > NEW.heure - make_interval(mins => duree)
        AND heure < NEW.heure + make_interval(mins => duree);
    IF tables_occupees >= nb_tables_total THEN
      RAISE EXCEPTION 'creneau_complet';
    END IF;
  END IF;

  -- Anti-spam : max 10 réservations créées pour ce restaurant sur 10 minutes
  SELECT count(*) INTO recent_count FROM reservations
    WHERE restaurant_id = NEW.restaurant_id
      AND created_at > now() - INTERVAL '10 minutes';
  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'trop_de_reservations';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Le trigger trg_validate_reservation existant pointe déjà sur cette fonction.
