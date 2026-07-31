-- Disponibilité de TOUS les créneaux d'une journée, en un seul appel.
--
-- Objectif : le client ne doit plus découvrir qu'un créneau est complet
-- APRÈS avoir rempli le formulaire. Le menu déroulant affiche désormais
-- « 20:00 — complet » (non sélectionnable) au lieu de laisser croire que
-- c'est réservable.
--
-- La fonction gère aussi le délai minimum : jusqu'ici, un client pouvait
-- choisir un créneau trop proche (ex. dans 30 min alors que le restaurant
-- demande 2 h) et se faire refuser au moment de valider.
--
-- Renvoie un tableau JSON : [{heure, total, occupees, complet, trop_tot, disponible}]
-- Uniquement des compteurs, aucune donnée personnelle → appelable par le widget.

CREATE OR REPLACE FUNCTION creneaux_disponibilite(
  p_restaurant_id uuid,
  p_date date
)
RETURNS json AS $$
DECLARE
  resto record;
  h record;
  duree int;
  nb_tables_total int;
  walkins int;
  now_paris timestamp;
  limite timestamp;      -- avant cette heure, le délai minimum n'est pas respecté
  resultat json;
BEGIN
  SELECT * INTO resto FROM restaurants WHERE id = p_restaurant_id;
  IF NOT FOUND THEN RETURN '[]'::json; END IF;

  -- Jour de fermeture exceptionnelle → aucun créneau
  IF EXISTS (SELECT 1 FROM fermetures
             WHERE restaurant_id = p_restaurant_id AND date = p_date) THEN
    RETURN '[]'::json;
  END IF;

  SELECT * INTO h FROM horaires
   WHERE restaurant_id = p_restaurant_id
     AND jour = CASE extract(dow FROM p_date)
       WHEN 0 THEN 'dimanche' WHEN 1 THEN 'lundi' WHEN 2 THEN 'mardi'
       WHEN 3 THEN 'mercredi' WHEN 4 THEN 'jeudi' WHEN 5 THEN 'vendredi'
       WHEN 6 THEN 'samedi' END;
  IF NOT FOUND OR NOT h.ouvert THEN RETURN '[]'::json; END IF;

  duree := COALESCE(resto.duree_occupation_minutes, 90);
  now_paris := now() AT TIME ZONE 'Europe/Paris';
  limite := now_paris + make_interval(hours => COALESCE(resto.delai_minimum_heures, 2));

  SELECT count(*) INTO nb_tables_total
    FROM plan_tables WHERE restaurant_id = p_restaurant_id;
  IF nb_tables_total = 0 THEN
    nb_tables_total := COALESCE(NULLIF(resto.nb_tables::text, '')::int, 0);
  END IF;

  -- Walk-ins en cours : ils ne pèsent que sur le service du jour même
  walkins := 0;
  IF p_date = now_paris::date THEN
    SELECT count(*) INTO walkins FROM table_assignments
     WHERE restaurant_id = p_restaurant_id
       AND status = 'occupee'
       AND reservation_id IS NULL;
  END IF;

  -- Créneaux toutes les 30 min, dernière arrivée 1 h avant la fin du service
  WITH creneaux AS (
    SELECT gs::time AS heure FROM generate_series(
      (p_date + h.midi_debut)::timestamp,
      (p_date + h.midi_fin - interval '60 minutes')::timestamp,
      interval '30 minutes') gs
    UNION
    SELECT gs::time FROM generate_series(
      (p_date + h.soir_debut)::timestamp,
      (p_date + h.soir_fin - interval '60 minutes')::timestamp,
      interval '30 minutes') gs
  ),
  charge AS (
    SELECT c.heure,
           (SELECT count(*) FROM reservations r
             WHERE r.restaurant_id = p_restaurant_id
               AND r.date = p_date
               AND r.statut <> 'annulée'
               AND r.heure > c.heure - make_interval(mins => duree)
               AND r.heure < c.heure + make_interval(mins => duree)
           )
           -- les walk-ins ne comptent que pour les créneaux du service en cours
           + CASE WHEN p_date = now_paris::date
                       AND c.heure < (now_paris + make_interval(mins => duree))::time
                  THEN walkins ELSE 0 END AS occupees
      FROM creneaux c
  )
  SELECT json_agg(json_build_object(
           'heure',      to_char(heure, 'HH24:MI'),
           'total',      nb_tables_total,
           'occupees',   occupees,
           'complet',    nb_tables_total > 0 AND occupees >= nb_tables_total,
           'trop_tot',   (p_date + heure) < limite,
           'disponible', (nb_tables_total = 0 OR occupees < nb_tables_total)
                         AND (p_date + heure) >= limite
         ) ORDER BY heure)
    INTO resultat
    FROM charge;

  RETURN COALESCE(resultat, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION creneaux_disponibilite(uuid, date) TO anon, authenticated;
