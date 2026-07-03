-- 1. Fermetures exceptionnelles (congés, jours fériés…)
CREATE TABLE IF NOT EXISTS fermetures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  motif text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (restaurant_id, date)
);

ALTER TABLE fermetures ENABLE ROW LEVEL SECURITY;

-- Lecture publique (le widget doit connaître les jours fermés)
DROP POLICY IF EXISTS "fermetures lecture publique" ON fermetures;
CREATE POLICY "fermetures lecture publique" ON fermetures
  FOR SELECT USING (true);

-- Écriture réservée au propriétaire du restaurant (et admin)
DROP POLICY IF EXISTS "fermetures ecriture proprietaire" ON fermetures;
CREATE POLICY "fermetures ecriture proprietaire" ON fermetures
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
    OR auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid
  )
  WITH CHECK (
    restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
    OR auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid
  );

-- 2. Trigger de validation :
--    - fermetures exceptionnelles bloquées
--    - walk-ins (tables occupées sans réservation) comptés dans la capacité du jour
--    - le restaurateur connecté (résa manuelle/téléphone) est exempté des règles
--      business (délai, horaires, doublon, capacité, spam) mais pas des contrôles de base
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
  walkins int;
  uid uuid;
  is_owner boolean;
  now_paris timestamp;
BEGIN
  SELECT * INTO resto FROM restaurants WHERE id = NEW.restaurant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'restaurant_inconnu';
  END IF;

  uid := auth.uid();
  is_owner := uid IS NOT NULL AND (uid = resto.user_id OR uid = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid);
  now_paris := now() AT TIME ZONE 'Europe/Paris';

  -- Contrôles de base (pour tout le monde)
  IF NEW.prenom IS NULL OR length(trim(NEW.prenom)) < 1 OR length(NEW.prenom) > 100 THEN
    RAISE EXCEPTION 'prenom_invalide';
  END IF;
  IF NEW.nom IS NULL OR length(trim(NEW.nom)) < 1 OR length(NEW.nom) > 100 THEN
    RAISE EXCEPTION 'nom_invalide';
  END IF;
  IF NEW.message IS NOT NULL AND length(NEW.message) > 1000 THEN
    RAISE EXCEPTION 'message_trop_long';
  END IF;
  IF NEW.date IS NULL OR NEW.date < CURRENT_DATE OR NEW.date > CURRENT_DATE + INTERVAL '1 year' THEN
    RAISE EXCEPTION 'date_invalide';
  END IF;

  -- Email : obligatoire et valide pour le public, facultatif pour le restaurateur
  IF NOT is_owner THEN
    IF NEW.email IS NULL OR NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(NEW.email) > 255 THEN
      RAISE EXCEPTION 'email_invalide';
    END IF;
  ELSIF NEW.email IS NOT NULL AND length(NEW.email) > 0
        AND NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'email_invalide';
  END IF;

  IF NEW.nb_personnes IS NULL OR NEW.nb_personnes < 1
     OR (NOT is_owner AND NEW.nb_personnes > COALESCE(resto.nb_couverts_max, 20))
     OR NEW.nb_personnes > 100 THEN
    RAISE EXCEPTION 'nb_personnes_invalide';
  END IF;

  -- Règles business : uniquement pour les réservations publiques
  IF NOT is_owner THEN
    -- Fermeture exceptionnelle
    IF EXISTS (SELECT 1 FROM fermetures
               WHERE restaurant_id = NEW.restaurant_id AND date = NEW.date) THEN
      RAISE EXCEPTION 'restaurant_ferme';
    END IF;

    -- Délai minimum
    IF (NEW.date::timestamp + NEW.heure)
       < now_paris + make_interval(hours => COALESCE(resto.delai_minimum_heures, 2)) THEN
      RAISE EXCEPTION 'delai_minimum_non_respecte';
    END IF;

    -- Horaires d'ouverture + dernière arrivée 1h avant la fin du service
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
      (NEW.heure >= h.midi_debut AND NEW.heure <= h.midi_fin - interval '60 minutes') OR
      (NEW.heure >= h.soir_debut AND NEW.heure <= h.soir_fin - interval '60 minutes')
    ) THEN
      RAISE EXCEPTION 'heure_hors_creneaux';
    END IF;

    -- Anti-doublon
    SELECT count(*) INTO same_email_count FROM reservations
      WHERE restaurant_id = NEW.restaurant_id
        AND email = NEW.email
        AND date = NEW.date
        AND statut <> 'annulée';
    IF same_email_count >= 2 THEN
      RAISE EXCEPTION 'doublon_email';
    END IF;

    -- Capacité (résas + walk-ins du moment)
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

      -- Walk-ins : tables actuellement occupées sans réservation, si la résa
      -- porte sur le service en cours
      IF NEW.date = now_paris::date
         AND NEW.heure < now_paris::time + make_interval(mins => duree) THEN
        SELECT count(*) INTO walkins FROM table_assignments
          WHERE restaurant_id = NEW.restaurant_id
            AND status = 'occupee'
            AND reservation_id IS NULL;
        tables_occupees := tables_occupees + COALESCE(walkins, 0);
      END IF;

      IF tables_occupees >= nb_tables_total THEN
        RAISE EXCEPTION 'creneau_complet';
      END IF;
    END IF;

    -- Anti-spam
    SELECT count(*) INTO recent_count FROM reservations
      WHERE restaurant_id = NEW.restaurant_id
        AND created_at > now() - INTERVAL '10 minutes';
    IF recent_count >= 10 THEN
      RAISE EXCEPTION 'trop_de_reservations';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Le restaurateur peut créer des réservations pour son propre restaurant
DROP POLICY IF EXISTS "Owner inserts own reservations" ON reservations;
CREATE POLICY "Owner inserts own reservations" ON reservations
  FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
  );
