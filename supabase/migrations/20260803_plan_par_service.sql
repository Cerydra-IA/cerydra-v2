-- Plusieurs services par table dans la même journée.
--
-- Jusqu'ici : une ligne par table et par jour. Placer une réservation de 21 h
-- sur une table déjà attribuée à 19 h écrasait la première, qui retournait
-- dans le bandeau « à placer ». Impossible donc de préparer les deux tournées
-- d'un service du soir.
--
-- Nouveau modèle — une ligne = un service sur une table :
--   * réservation placée → service_at = heure de la réservation
--   * client sans réservation → service_at = heure d'installation
--   * table bloquée → service_at NULL, la ligne vaut pour toute la journée
--   * table libre → aucune ligne (l'absence vaut disponibilité)
--
-- Le plan affiche la salle à un instant choisi : une table montre le service
-- dont la fenêtre couvre cet instant.

-- ── 1. Les lignes « libre » n'ont plus de raison d'être ────────────────────
DELETE FROM table_assignments WHERE status = 'libre';

-- ── 2. Un blocage vaut pour la journée entière ─────────────────────────────
UPDATE table_assignments SET service_at = NULL WHERE status = 'bloquee';

-- ── 3. Une occupation sans horodatage prend celui de sa création ───────────
UPDATE table_assignments
   SET service_at = COALESCE(service_at, started_at, created_at)
 WHERE status <> 'bloquee' AND service_at IS NULL;

-- ── 4. Nouvelles règles d'unicité ──────────────────────────────────────────
DROP INDEX IF EXISTS table_assignments_table_jour;

-- deux services ne peuvent pas commencer à la même heure sur la même table
CREATE UNIQUE INDEX IF NOT EXISTS table_assignments_table_service
  ON table_assignments (table_id, service_at)
  WHERE service_at IS NOT NULL;

-- un seul blocage par table et par jour
CREATE UNIQUE INDEX IF NOT EXISTS table_assignments_table_blocage
  ON table_assignments (table_id, service_date)
  WHERE service_at IS NULL;

-- ── 5. Capacités : une table bloquée sort du pool, une table occupée aussi ─
-- tant que son service couvre le moment considéré.
CREATE OR REPLACE FUNCTION capacites_tables(
  p_restaurant_id uuid,
  p_date date,
  p_service_en_cours boolean
)
RETURNS int[] AS $$
DECLARE
  caps int[];
  resto record;
  now_paris timestamp;
BEGIN
  SELECT * INTO resto FROM restaurants WHERE id = p_restaurant_id;
  now_paris := now() AT TIME ZONE 'Europe/Paris';

  SELECT array_agg(t.capacity ORDER BY t.capacity)
    INTO caps
    FROM plan_tables t
   WHERE t.restaurant_id = p_restaurant_id
     AND NOT EXISTS (
       SELECT 1 FROM table_assignments a
        WHERE a.table_id = t.id
          AND a.service_date = p_date
          AND (
            (a.status = 'bloquee' AND a.service_at IS NULL)
            OR (
              p_service_en_cours
              AND a.status = 'occupee'
              AND a.reservation_id IS NULL
              AND a.started_at IS NOT NULL
              AND now_paris < (a.started_at AT TIME ZONE 'Europe/Paris')
                  + make_interval(mins => COALESCE(a.duration_minutes,
                                                   resto.duree_occupation_minutes, 90))
            )
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

-- ── 6. Libération automatique : on supprime le service échu ────────────────
-- Une ligne périmée n'a plus à exister : l'absence de ligne vaut « libre ».
CREATE OR REPLACE FUNCTION liberer_tables_expirees()
RETURNS integer AS $$
DECLARE n integer;
BEGIN
  WITH supprimees AS (
    DELETE FROM table_assignments a
     USING restaurants r
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
         (a.started_at IS NULL AND a.service_at IS NULL AND a.service_date < CURRENT_DATE)
       )
    RETURNING 1
  )
  SELECT count(*) INTO n FROM supprimees;

  DELETE FROM table_assignments
   WHERE service_date < CURRENT_DATE - INTERVAL '7 days';

  RETURN n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
