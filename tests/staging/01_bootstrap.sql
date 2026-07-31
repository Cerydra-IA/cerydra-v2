-- ═══════════════════════════════════════════════════════════════════════════
-- CERYDRA — initialisation de l'environnement de STAGING
--
-- ⚠️  À exécuter dans le SQL Editor du projet **cerydra-staging** uniquement.
--
-- Généré par tests/staging/build_bootstrap.py à partir du schéma de production.
-- Les triggers d'envoi (webhooks Make, notification push) sont volontairement
-- ABSENTS : le staging ne doit jamais envoyer d'email ni de notification.
--
-- Ensuite : 02_seed.sql (restaurant de test) puis npm run simulate.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.restaurants (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  nom text,
  slug text,
  adresse text,
  telephone text,
  description text,
  nb_tables integer,
  nb_couverts_max integer,
  delai_minimum_heures integer DEFAULT 2,
  message_confirmation text,
  created_at timestamp without time zone DEFAULT now(),
  widget_primary_color text DEFAULT '#1a1a2e'::text,
  widget_bg_color text DEFAULT '#ffffff'::text,
  widget_button_text text DEFAULT 'Confirmer la réservation'::text,
  widget_bg_image_url text,
  duree_occupation_minutes integer DEFAULT 90
);

CREATE TABLE IF NOT EXISTS public.horaires (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  restaurant_id uuid,
  jour text,
  ouvert boolean DEFAULT true,
  midi_debut time without time zone,
  midi_fin time without time zone,
  soir_debut time without time zone,
  soir_fin time without time zone
);

CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  restaurant_id uuid,
  prenom text,
  nom text,
  email text,
  telephone text,
  date date,
  heure time without time zone,
  nb_personnes integer,
  message text,
  statut text DEFAULT 'en_attente'::text,
  created_at timestamp without time zone DEFAULT now(),
  cancel_token uuid DEFAULT gen_random_uuid(),
  reminder_sent boolean DEFAULT false NOT NULL,
  post_visit_sent boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS public.plan_tables (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  capacity integer DEFAULT 4 NOT NULL,
  shape text DEFAULT 'round'::text NOT NULL,
  zone text DEFAULT 'salle'::text NOT NULL,
  x_pct double precision DEFAULT 20 NOT NULL,
  y_pct double precision DEFAULT 25 NOT NULL,
  duration_minutes integer DEFAULT 90 NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.table_assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  restaurant_id uuid NOT NULL,
  table_id uuid NOT NULL,
  reservation_id uuid,
  client_name text,
  nb_persons integer,
  status text DEFAULT 'libre'::text NOT NULL,
  started_at timestamp with time zone,
  duration_minutes integer DEFAULT 90,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  restaurant_id uuid,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fermetures (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  restaurant_id uuid NOT NULL,
  date date NOT NULL,
  motif text,
  created_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fermetures_pkey') THEN
    ALTER TABLE fermetures ADD CONSTRAINT fermetures_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fermetures_restaurant_id_date_key') THEN
    ALTER TABLE fermetures ADD CONSTRAINT fermetures_restaurant_id_date_key UNIQUE (restaurant_id, date);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'horaires_pkey') THEN
    ALTER TABLE horaires ADD CONSTRAINT horaires_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_tables_pkey') THEN
    ALTER TABLE plan_tables ADD CONSTRAINT plan_tables_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_endpoint_key') THEN
    ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_pkey') THEN
    ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_cancel_token_key') THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_cancel_token_key UNIQUE (cancel_token);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_pkey') THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_pkey') THEN
    ALTER TABLE restaurants ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_slug_key') THEN
    ALTER TABLE restaurants ADD CONSTRAINT restaurants_slug_key UNIQUE (slug);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'table_assignments_pkey') THEN
    ALTER TABLE table_assignments ADD CONSTRAINT table_assignments_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fermetures_restaurant_id_fkey') THEN
    ALTER TABLE fermetures ADD CONSTRAINT fermetures_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'horaires_restaurant_id_fkey') THEN
    ALTER TABLE horaires ADD CONSTRAINT horaires_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_tables_restaurant_id_fkey') THEN
    ALTER TABLE plan_tables ADD CONSTRAINT plan_tables_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_restaurant_id_fkey') THEN
    ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_user_id_fkey') THEN
    ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_restaurant_id_fkey') THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_user_id_fkey') THEN
    ALTER TABLE restaurants ADD CONSTRAINT restaurants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'table_assignments_reservation_id_fkey') THEN
    ALTER TABLE table_assignments ADD CONSTRAINT table_assignments_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'table_assignments_restaurant_id_fkey') THEN
    ALTER TABLE table_assignments ADD CONSTRAINT table_assignments_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'table_assignments_table_id_fkey') THEN
    ALTER TABLE table_assignments ADD CONSTRAINT table_assignments_table_id_fkey FOREIGN KEY (table_id) REFERENCES plan_tables(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS horaires_pkey ON public.horaires USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS reservations_pkey ON public.reservations USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS reservations_cancel_token_key ON public.reservations USING btree (cancel_token);

CREATE INDEX IF NOT EXISTS idx_reservations_reminder ON public.reservations USING btree (date, reminder_sent, statut);

CREATE INDEX IF NOT EXISTS idx_reservations_cancel_token ON public.reservations USING btree (cancel_token) WHERE (cancel_token IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS restaurants_pkey ON public.restaurants USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS restaurants_slug_key ON public.restaurants USING btree (slug);

CREATE UNIQUE INDEX IF NOT EXISTS plan_tables_pkey ON public.plan_tables USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS table_assignments_pkey ON public.table_assignments USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_pkey ON public.push_subscriptions USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_key ON public.push_subscriptions USING btree (endpoint);

CREATE UNIQUE INDEX IF NOT EXISTS fermetures_pkey ON public.fermetures USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS fermetures_restaurant_id_date_key ON public.fermetures USING btree (restaurant_id, date);

CREATE OR REPLACE FUNCTION public.annuler_reservation(p_token uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare

  v_res reservations%rowtype;
begin
  update reservations
  set statut = 'annulée'
  where cancel_token = p_token
    and statut != 'annulée'

  returning * into v_res;
  if v_res.id is null then
    select * into v_res from reservations where cancel_token = p_token;
    if v_res.id is null then
      return json_build_object('success', false, 'error', 'Lien invalide ou expiré.');
    else
      return json_build_object('success', false, 'error', 'Cette réservation est déjà annulée.');
    end if;
  end if;
  return json_build_object(

    'success', true,

    'prenom', v_res.prenom,

    'nom',    v_res.nom,

    'date',   v_res.date,

    'heure',  v_res.heure

  );
end;

$function$;

CREATE OR REPLACE FUNCTION public.chercher_reservations_annulation(p_email text, p_slug text)
 RETURNS TABLE(id uuid, prenom text, nom text, date date, heure time without time zone, nb_personnes integer, statut text, cancel_token uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select r.id, r.prenom, r.nom, r.date, r.heure, r.nb_personnes, r.statut, r.cancel_token
  from reservations r

  join restaurants rest on rest.id = r.restaurant_id
  where lower(r.email) = lower(p_email)
    and rest.slug = p_slug
    and r.date >= current_date
    and r.statut != 'annulée'

  order by r.date asc, r.heure asc;
end;

$function$;

CREATE OR REPLACE FUNCTION public.validate_reservation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    SELECT count(*) INTO recent_count FROM reservations
      WHERE restaurant_id = NEW.restaurant_id
        AND created_at > now() - INTERVAL '10 minutes';
    IF recent_count >= 10 THEN

      RAISE EXCEPTION 'trop_de_reservations';
    END IF;
  END IF;
  RETURN NEW;
END;

$function$;

DROP TRIGGER IF EXISTS trg_validate_reservation ON public.reservations;
CREATE TRIGGER trg_validate_reservation BEFORE INSERT ON public.reservations FOR EACH ROW EXECUTE FUNCTION validate_reservation();

ALTER TABLE public.horaires ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.plan_tables ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.table_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fermetures ENABLE ROW LEVEL SECURITY;


-- ═══ migration 20260703_capacite_creneaux.sql ═══

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


-- ═══ migration 20260703_derniere_arrivee.sql ═══

-- Dernière arrivée : 1h avant la fin du service (widget + trigger alignés)

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
  -- Dernière arrivée : 1h avant la fin du service
  IF NOT (
    (NEW.heure >= h.midi_debut AND NEW.heure <= h.midi_fin - interval '60 minutes') OR
    (NEW.heure >= h.soir_debut AND NEW.heure <= h.soir_fin - interval '60 minutes')
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


-- ═══ migration 20260703_fermetures_walkins_manuel.sql ═══

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


-- ═══ migration 20260708_plan_statuts_temporels.sql ═══

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


-- ═══ migration 20260708_creneau_disponibilite.sql ═══

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


-- ═══ migration 20260730_creneaux_du_jour.sql ═══

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


-- ── Politiques RLS ──────────────────────────────────────────────────────────
ALTER TABLE restaurants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE horaires          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tables       ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fermetures        ENABLE ROW LEVEL SECURITY;

-- Lecture publique de ce dont le widget a besoin
DROP POLICY IF EXISTS "Lecture publique restaurant" ON restaurants;
CREATE POLICY "Lecture publique restaurant" ON restaurants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lecture publique horaires" ON horaires;
CREATE POLICY "Lecture publique horaires" ON horaires FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lecture publique fermetures" ON fermetures;
CREATE POLICY "Lecture publique fermetures" ON fermetures FOR SELECT USING (true);

-- Création de réservation ouverte (widget), mais aucune lecture publique
DROP POLICY IF EXISTS "Creation reservation" ON reservations;
CREATE POLICY "Creation reservation" ON reservations FOR INSERT WITH CHECK (true);

-- Le propriétaire gère son restaurant
DROP POLICY IF EXISTS "Proprietaire lit ses reservations" ON reservations;
CREATE POLICY "Proprietaire lit ses reservations" ON reservations
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Proprietaire modifie ses reservations" ON reservations;
CREATE POLICY "Proprietaire modifie ses reservations" ON reservations
  FOR UPDATE TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Proprietaire supprime ses reservations" ON reservations;
CREATE POLICY "Proprietaire supprime ses reservations" ON reservations
  FOR DELETE TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Proprietaire gere son restaurant" ON restaurants;
CREATE POLICY "Proprietaire gere son restaurant" ON restaurants
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Proprietaire gere ses horaires" ON horaires;
CREATE POLICY "Proprietaire gere ses horaires" ON horaires
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Proprietaire gere son plan" ON plan_tables;
CREATE POLICY "Proprietaire gere son plan" ON plan_tables
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Proprietaire gere ses assignations" ON table_assignments;
CREATE POLICY "Proprietaire gere ses assignations" ON table_assignments
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Proprietaire gere ses fermetures" ON fermetures;
CREATE POLICY "Proprietaire gere ses fermetures" ON fermetures
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

-- ── Job de libération des tables ────────────────────────────────────────────
SELECT cron.unschedule('liberer-tables-expirees')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'liberer-tables-expirees');
SELECT cron.schedule('liberer-tables-expirees', '*/15 * * * *',
  $$SELECT liberer_tables_expirees();$$);

SELECT '✅ staging prêt — aucun webhook actif' AS resultat;
