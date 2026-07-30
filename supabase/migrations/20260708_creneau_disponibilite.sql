-- Disponibilité d'un créneau, exposée à l'application.
--
-- Pourquoi : les réservations créées par le restaurateur (téléphone / sur place)
-- sont volontairement exemptées du contrôle de capacité — il est chez lui, il
-- décide. Mais à plusieurs personnes qui prennent des appels en même temps,
-- plus personne ne sait combien de tables restent : on peut vendre deux fois la
-- dernière table. Cette fonction permet d'AFFICHER un avertissement sans
-- bloquer.
--
-- Même logique que le bloc « capacité » de validate_reservation() : une table
-- est occupée pendant duree_occupation_minutes autour de l'heure demandée, et
-- les walk-ins du service en cours comptent aussi.
--
-- Servira également à griser les créneaux complets dans le widget public.

CREATE OR REPLACE FUNCTION creneau_disponibilite(
  p_restaurant_id uuid,
  p_date date,
  p_heure time
)
RETURNS json AS $$
DECLARE
  resto record;
  duree int;
  nb_tables_total int;
  tables_occupees int;
  walkins int;
  now_paris timestamp;
BEGIN
  SELECT * INTO resto FROM restaurants WHERE id = p_restaurant_id;
  IF NOT FOUND THEN
    RETURN json_build_object('erreur', 'restaurant_inconnu');
  END IF;

  duree := COALESCE(resto.duree_occupation_minutes, 90);
  now_paris := now() AT TIME ZONE 'Europe/Paris';

  -- Nombre de tables : plan de salle, sinon la config du restaurant
  SELECT count(*) INTO nb_tables_total
    FROM plan_tables WHERE restaurant_id = p_restaurant_id;
  IF nb_tables_total = 0 THEN
    nb_tables_total := COALESCE(NULLIF(resto.nb_tables::text, '')::int, 0);
  END IF;

  -- Réservations actives dont la fenêtre chevauche l'heure demandée
  SELECT count(*) INTO tables_occupees
    FROM reservations
   WHERE restaurant_id = p_restaurant_id
     AND date = p_date
     AND statut <> 'annulée'
     AND heure > p_heure - make_interval(mins => duree)
     AND heure < p_heure + make_interval(mins => duree);

  -- Walk-ins en cours (uniquement si le créneau concerne le service actuel)
  IF p_date = now_paris::date
     AND p_heure < now_paris::time + make_interval(mins => duree) THEN
    SELECT count(*) INTO walkins
      FROM table_assignments
     WHERE restaurant_id = p_restaurant_id
       AND status = 'occupee'
       AND reservation_id IS NULL;
    tables_occupees := tables_occupees + COALESCE(walkins, 0);
  END IF;

  RETURN json_build_object(
    'tables_total',    nb_tables_total,
    'tables_occupees', tables_occupees,
    'restant',         GREATEST(nb_tables_total - tables_occupees, 0),
    'complet',         nb_tables_total > 0 AND tables_occupees >= nb_tables_total,
    'duree_minutes',   duree
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Ne renvoie que des compteurs (aucune donnée personnelle) : utilisable par le
-- widget public comme par le dashboard.
GRANT EXECUTE ON FUNCTION creneau_disponibilite(uuid, date, time) TO anon, authenticated;
