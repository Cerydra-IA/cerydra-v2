-- Validation serveur des réservations (anti-abus widget public)
-- Le widget expose la clé anon : n'importe qui peut POSTer directement sur
-- rest/v1/reservations. Ce trigger garantit que seules des réservations
-- plausibles passent, quel que soit le client.

CREATE OR REPLACE FUNCTION validate_reservation()
RETURNS trigger AS $$
DECLARE
  resto record;
  jour_nom text;
  h record;
  heure_min time;
  recent_count int;
  same_email_count int;
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

DROP TRIGGER IF EXISTS trg_validate_reservation ON reservations;
CREATE TRIGGER trg_validate_reservation
  BEFORE INSERT ON reservations
  FOR EACH ROW EXECUTE FUNCTION validate_reservation();
