-- Capacité : on raisonne en PLACES, plus seulement en nombre de tables.
--
-- Problème corrigé : un groupe de 6 « prenait une table », même si toutes les
-- tables du restaurant font 2 couverts. Le restaurateur se retrouvait avec une
-- réservation qu'il ne pouvait pas asseoir.
--
-- Modèle retenu, calqué sur la réalité d'une salle :
--   * chaque groupe reçoit la plus petite table où il tient (on ne met pas
--     2 personnes sur une table de 6 tant qu'une table de 2 est libre) ;
--   * si aucune table seule ne suffit, on assemble les plus grandes tables
--     disponibles jusqu'à couvrir le groupe — ce que fait tout restaurant ;
--   * si on ne peut plus placer, le créneau est complet POUR CE GROUPE.
--
-- Conséquence importante : la disponibilité dépend désormais de la taille du
-- groupe. Un créneau peut être libre pour 2 personnes et complet pour 6 ; les
-- fonctions d'affichage prennent donc un paramètre p_personnes.

-- ── 1. Placement d'une liste de groupes sur une liste de tables ─────────────
CREATE OR REPLACE FUNCTION peut_placer(caps int[], groupes int[])
RETURNS boolean AS $$
DECLARE
  dispo int[] := COALESCE(caps, ARRAY[]::int[]);
  g int; i int; n int;
  meilleure int; idx int; somme int;
BEGIN
  IF groupes IS NULL OR array_length(groupes, 1) IS NULL THEN
    RETURN true;
  END IF;

  FOREACH g IN ARRAY groupes LOOP
    n := COALESCE(array_length(dispo, 1), 0);

    -- plus petite table où le groupe tient
    idx := NULL; meilleure := NULL;
    FOR i IN 1..n LOOP
      IF dispo[i] >= g AND (meilleure IS NULL OR dispo[i] < meilleure) THEN
        meilleure := dispo[i]; idx := i;
      END IF;
    END LOOP;

    IF idx IS NOT NULL THEN
      dispo := dispo[1:idx-1] || dispo[idx+1:n];
    ELSE
      -- assemblage : les plus grandes tables d'abord, pour en mobiliser le moins
      somme := 0;
      LOOP
        EXIT WHEN somme >= g;
        n := COALESCE(array_length(dispo, 1), 0);
        idx := NULL; meilleure := NULL;
        FOR i IN 1..n LOOP
          IF meilleure IS NULL OR dispo[i] > meilleure THEN
            meilleure := dispo[i]; idx := i;
          END IF;
        END LOOP;
        IF idx IS NULL THEN
          RETURN false;   -- plus aucune table : impossible de placer ce groupe
        END IF;
        somme := somme + dispo[idx];
        dispo := dispo[1:idx-1] || dispo[idx+1:n];
      END LOOP;
    END IF;
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── 2. Capacités disponibles d'un restaurant à un instant donné ─────────────
-- Retire les tables bloquées et celles occupées par des clients sans
-- réservation (walk-ins), qui ne sont pas dans la table reservations.
CREATE OR REPLACE FUNCTION capacites_tables(p_restaurant_id uuid, p_service_en_cours boolean)
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
          AND (
            a.status = 'bloquee'
            OR (p_service_en_cours AND a.status = 'occupee' AND a.reservation_id IS NULL)
          )
     );

  -- Aucun plan de salle : on retombe sur la configuration déclarée
  IF caps IS NULL THEN
    SELECT array_agg(COALESCE(NULLIF(resto.nb_couverts_max::text, '')::int, 4))
      INTO caps
      FROM generate_series(1, GREATEST(COALESCE(NULLIF(resto.nb_tables::text, '')::int, 0), 0));
  END IF;

  RETURN COALESCE(caps, ARRAY[]::int[]);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── 3. Le créneau peut-il accueillir un groupe de plus ? ────────────────────
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

  caps := capacites_tables(p_restaurant_id, service_en_cours);
  IF array_length(caps, 1) IS NULL THEN
    RETURN true;   -- aucune information de salle : on n'empêche rien
  END IF;

  -- Groupes déjà attendus sur la fenêtre, du plus grand au plus petit,
  -- plus le nouveau groupe.
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

-- ── 4. Disponibilité d'un créneau (dashboard) — tient compte du groupe ──────
CREATE OR REPLACE FUNCTION creneau_disponibilite(
  p_restaurant_id uuid,
  p_date date,
  p_heure time,
  p_personnes int DEFAULT 2
)
RETURNS json AS $$
DECLARE
  resto record;
  duree int;
  nb_tables_total int;
  tables_occupees int;
  walkins int;
  now_paris timestamp;
  accueil boolean;
BEGIN
  SELECT * INTO resto FROM restaurants WHERE id = p_restaurant_id;
  IF NOT FOUND THEN RETURN json_build_object('erreur', 'restaurant_inconnu'); END IF;

  duree := COALESCE(resto.duree_occupation_minutes, 90);
  now_paris := now() AT TIME ZONE 'Europe/Paris';

  SELECT count(*) INTO nb_tables_total
    FROM plan_tables WHERE restaurant_id = p_restaurant_id;
  IF nb_tables_total = 0 THEN
    nb_tables_total := COALESCE(NULLIF(resto.nb_tables::text, '')::int, 0);
  END IF;

  SELECT count(*) INTO tables_occupees
    FROM reservations
   WHERE restaurant_id = p_restaurant_id
     AND date = p_date
     AND statut <> 'annulée'
     AND heure > p_heure - make_interval(mins => duree)
     AND heure < p_heure + make_interval(mins => duree);

  IF p_date = now_paris::date
     AND p_heure < (now_paris + make_interval(mins => duree))::time THEN
    SELECT count(*) INTO walkins FROM table_assignments
     WHERE restaurant_id = p_restaurant_id
       AND status = 'occupee' AND reservation_id IS NULL;
    tables_occupees := tables_occupees + COALESCE(walkins, 0);
  END IF;

  accueil := creneau_peut_accueillir(p_restaurant_id, p_date, p_heure, p_personnes);

  RETURN json_build_object(
    'tables_total',    nb_tables_total,
    'tables_occupees', tables_occupees,
    'restant',         GREATEST(nb_tables_total - tables_occupees, 0),
    'complet',         NOT accueil,
    'personnes',       p_personnes,
    'duree_minutes',   duree
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION creneau_disponibilite(uuid, date, time, int) TO anon, authenticated;

-- ── 5. Créneaux du jour — la disponibilité dépend du groupe ────────────────
CREATE OR REPLACE FUNCTION creneaux_disponibilite(
  p_restaurant_id uuid,
  p_date date,
  p_personnes int DEFAULT 2
)
RETURNS json AS $$
DECLARE
  resto record;
  h record;
  duree int;
  now_paris timestamp;
  limite timestamp;
  resultat json;
BEGIN
  SELECT * INTO resto FROM restaurants WHERE id = p_restaurant_id;
  IF NOT FOUND THEN RETURN '[]'::json; END IF;

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
  etat AS (
    SELECT c.heure,
           creneau_peut_accueillir(p_restaurant_id, p_date, c.heure, p_personnes) AS accueil,
           (p_date + c.heure) < limite AS trop_tot
      FROM creneaux c
  )
  SELECT json_agg(json_build_object(
           'heure',      to_char(heure, 'HH24:MI'),
           'complet',    NOT accueil,
           'trop_tot',   trop_tot,
           'personnes',  p_personnes,
           'disponible', accueil AND NOT trop_tot
         ) ORDER BY heure)
    INTO resultat
    FROM etat;

  RETURN COALESCE(resultat, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION creneaux_disponibilite(uuid, date, int) TO anon, authenticated;

-- ── 6. Le trigger de validation applique la même règle ─────────────────────
CREATE OR REPLACE FUNCTION validate_reservation()
RETURNS trigger AS $$
DECLARE
  resto record;
  jour_nom text;
  h record;
  recent_count int;
  same_email_count int;
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

  IF NOT is_owner THEN
    IF EXISTS (SELECT 1 FROM fermetures
               WHERE restaurant_id = NEW.restaurant_id AND date = NEW.date) THEN
      RAISE EXCEPTION 'restaurant_ferme';
    END IF;

    IF (NEW.date::timestamp + NEW.heure)
       < now_paris + make_interval(hours => COALESCE(resto.delai_minimum_heures, 2)) THEN
      RAISE EXCEPTION 'delai_minimum_non_respecte';
    END IF;

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

    SELECT count(*) INTO same_email_count FROM reservations
      WHERE restaurant_id = NEW.restaurant_id
        AND email = NEW.email
        AND date = NEW.date
        AND statut <> 'annulée';
    IF same_email_count >= 2 THEN
      RAISE EXCEPTION 'doublon_email';
    END IF;

    -- Capacité en places : le groupe doit pouvoir être assis
    IF NOT creneau_peut_accueillir(NEW.restaurant_id, NEW.date, NEW.heure, NEW.nb_personnes) THEN
      RAISE EXCEPTION 'creneau_complet';
    END IF;

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
