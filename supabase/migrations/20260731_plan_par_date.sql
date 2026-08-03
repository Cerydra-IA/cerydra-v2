-- Plan de salle par date.
--
-- Jusqu'ici, table_assignments décrivait l'état courant de la salle : une ligne
-- par table, sans notion de jour. Impossible donc de préparer le placement de
-- demain soir sans écraser le service en cours.
--
-- On ajoute une date de service : une ligne par table ET par jour. Le plan
-- affiche la journée choisie, et le service du soir n'efface plus le travail
-- de préparation du lendemain.

-- ── 1. Date de service ─────────────────────────────────────────────────────
ALTER TABLE table_assignments
  ADD COLUMN IF NOT EXISTS service_date date;

-- Reconstitution pour les lignes existantes, dans l'ordre de fiabilité
UPDATE table_assignments
   SET service_date = COALESCE(
         (service_at AT TIME ZONE 'Europe/Paris')::date,
         (started_at AT TIME ZONE 'Europe/Paris')::date,
         (created_at AT TIME ZONE 'Europe/Paris')::date,
         CURRENT_DATE)
 WHERE service_date IS NULL;

ALTER TABLE table_assignments
  ALTER COLUMN service_date SET DEFAULT CURRENT_DATE;

-- Une seule ligne par table et par jour. On dédoublonne d'abord l'historique
-- en conservant la plus récente.
DELETE FROM table_assignments a
 USING table_assignments b
 WHERE a.table_id = b.table_id
   AND a.service_date = b.service_date
   AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS table_assignments_table_jour
  ON table_assignments (table_id, service_date);

CREATE INDEX IF NOT EXISTS table_assignments_resto_jour
  ON table_assignments (restaurant_id, service_date);

-- ── 2. Capacités disponibles : on raisonne désormais pour une date donnée ──
DROP FUNCTION IF EXISTS capacites_tables(uuid, boolean);

CREATE OR REPLACE FUNCTION capacites_tables(
  p_restaurant_id uuid,
  p_date date,
  p_service_en_cours boolean
)
RETURNS int[] AS $$
DECLARE
  caps int[];
  resto record;
BEGIN
  SELECT * INTO resto FROM restaurants WHERE id = p_restaurant_id;

  SELECT array_agg(t.capacity ORDER BY t.capacity)
    INTO caps
    FROM plan_tables t
   WHERE t.restaurant_id = p_restaurant_id
     AND NOT EXISTS (
       SELECT 1 FROM table_assignments a
        WHERE a.table_id = t.id
          AND a.service_date = p_date
          AND (
            a.status = 'bloquee'
            OR (p_service_en_cours AND a.status = 'occupee' AND a.reservation_id IS NULL)
          )
     );

  IF caps IS NULL THEN
    SELECT array_agg(COALESCE(NULLIF(resto.nb_couverts_max::text, '')::int, 4))
      INTO caps
      FROM generate_series(1, GREATEST(COALESCE(NULLIF(resto.nb_tables::text, '')::int, 0), 0));
  END IF;

  RETURN COALESCE(caps, ARRAY[]::int[]);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── 3. Le calcul de capacité passe la date ────────────────────────────────
CREATE OR REPLACE FUNCTION creneau_peut_accueillir(
  p_restaurant_id uuid,
  p_date date,
  p_heure time,
  p_personnes int
)
RETURNS boolean AS $$
DECLARE
  resto record;
  duree int;
  caps int[];
  groupes int[];
  now_paris timestamp;
  service_en_cours boolean;
BEGIN
  SELECT * INTO resto FROM restaurants WHERE id = p_restaurant_id;
  IF NOT FOUND THEN RETURN false; END IF;

  duree := COALESCE(resto.duree_occupation_minutes, 90);
  now_paris := now() AT TIME ZONE 'Europe/Paris';
  service_en_cours := p_date = now_paris::date
                      AND p_heure < (now_paris + make_interval(mins => duree))::time;

  caps := capacites_tables(p_restaurant_id, p_date, service_en_cours);
  IF array_length(caps, 1) IS NULL THEN
    RETURN true;
  END IF;

  SELECT array_agg(nb ORDER BY nb DESC) INTO groupes FROM (
    SELECT r.nb_personnes AS nb
      FROM reservations r
     WHERE r.restaurant_id = p_restaurant_id
       AND r.date = p_date
       AND r.statut <> 'annulée'
       AND r.heure > p_heure - make_interval(mins => duree)
       AND r.heure < p_heure + make_interval(mins => duree)
    UNION ALL
    SELECT GREATEST(p_personnes, 1)
  ) x;

  RETURN peut_placer(caps, groupes);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION creneau_peut_accueillir(uuid, date, time, int) TO anon, authenticated;

-- ── 4. La libération automatique ne concerne que le jour même ─────────────
CREATE OR REPLACE FUNCTION liberer_tables_expirees()
RETURNS integer AS $$
DECLARE n integer;
BEGIN
  WITH libere AS (
    UPDATE table_assignments a
    SET status = 'libre',
        client_name = NULL,
        nb_persons = NULL,
        reservation_id = NULL,
        notes = NULL,
        started_at = NULL,
        service_at = NULL
    FROM restaurants r
    WHERE r.id = a.restaurant_id
      AND a.status IN ('occupee', 'reservee')
      AND (
        (a.status = 'occupee' AND a.started_at IS NOT NULL
          AND now() > a.started_at
              + make_interval(mins => COALESCE(a.duration_minutes, r.duree_occupation_minutes, 90) + 15))
        OR
        (a.status = 'reservee' AND a.service_at IS NOT NULL
          AND now() > a.service_at
              + make_interval(mins => COALESCE(a.duration_minutes, r.duree_occupation_minutes, 90) + 90))
        OR
        -- ligne sans horodatage d'un jour révolu
        (a.started_at IS NULL AND a.service_at IS NULL
          AND a.service_date < CURRENT_DATE)
      )
    RETURNING 1
  )
  SELECT count(*) INTO n FROM libere;

  -- Les journées passées n'ont plus à encombrer le plan
  DELETE FROM table_assignments
   WHERE service_date < CURRENT_DATE - INTERVAL '7 days';

  RETURN n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
