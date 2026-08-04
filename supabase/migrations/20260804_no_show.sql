-- No-show : distinguer « le client a prévenu » (annulée) de « personne n'est
-- venu, sans nouvelles » (no_show). Sert à mesurer un vrai problème
-- opérationnel (tables bloquées pour rien) plutôt que de le noyer dans le
-- taux d'annulation.
--
-- reservations.statut est un simple text sans contrainte CHECK : 'no_show'
-- est une valeur de plus, aucune migration de schéma n'est nécessaire pour
-- la colonne elle-même.

-- Le nettoyage automatique des tables périmées (app fermée, via pg_cron)
-- doit marquer la réservation no_show AVANT de libérer la table, sinon une
-- réservation jamais traitée à la main disparaît sans laisser de trace.
CREATE OR REPLACE FUNCTION liberer_tables_expirees()
RETURNS integer AS $$
DECLARE n integer;
BEGIN
  -- Réservations en retard non traitées à la main : elles vont être
  -- supprimées du plan juste après, on les marque no_show avant.
  UPDATE reservations res SET statut = 'no_show'
  FROM table_assignments a, restaurants r
  WHERE a.reservation_id = res.id
    AND r.id = a.restaurant_id
    AND a.status = 'reservee'
    AND a.service_at IS NOT NULL
    AND now() > a.service_at
        + make_interval(mins => COALESCE(a.duration_minutes, r.duree_occupation_minutes, 90) + 90);

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
