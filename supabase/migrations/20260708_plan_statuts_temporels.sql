-- Bug : les statuts du plan de salle ne s'actualisaient jamais.
-- Une table marquée « occupée » à midi restait rouge à 23h (et les jours
-- suivants), et une table « réservée » apparaissait jaune toute la journée.
-- Effet de bord grave : le trigger de capacité compte les walk-ins
-- (status='occupee' sans reservation_id) → des lignes périmées faisaient
-- refuser des réservations en ligne à tort.
--
-- Principe : on distingue l'intention stockée de l'état affiché.
--   * service_at        = date+heure du service prévu (pour les résas placées)
--   * started_at        = heure réelle d'installation (déjà présent)
--   * liberer_tables_expirees() libère les lignes périmées (cron /15 min)
-- Le calcul de l'état affiché se fait côté client (voir src/pages/PlanDeSalle.jsx).

-- 1. Horodatage du service prévu pour les réservations placées sur une table
ALTER TABLE table_assignments
  ADD COLUMN IF NOT EXISTS service_at timestamptz;

-- Backfill : reconstruit service_at pour les assignations déjà liées à une résa
UPDATE table_assignments a
SET service_at = ((r.date::timestamp + r.heure) AT TIME ZONE 'Europe/Paris')
FROM reservations r
WHERE a.reservation_id = r.id
  AND a.service_at IS NULL;

-- 2. Libération des tables périmées
--    - occupée : durée écoulée + 15 min de grâce
--    - réservée : créneau passé de (durée + 90 min) sans installation
--    - filet de sécurité : ligne sans horodatage vieille de plus de 12 h
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
        (a.started_at IS NULL AND a.service_at IS NULL
          AND a.created_at < now() - interval '12 hours')
      )
    RETURNING 1
  )
  SELECT count(*) INTO n FROM libere;
  RETURN n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Passage automatique toutes les 15 minutes
SELECT cron.unschedule('liberer-tables-expirees')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'liberer-tables-expirees');

SELECT cron.schedule(
  'liberer-tables-expirees',
  '*/15 * * * *',
  $$SELECT liberer_tables_expirees();$$
);

-- Nettoyage immédiat de l'existant
SELECT liberer_tables_expirees();
