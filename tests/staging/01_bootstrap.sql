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


-- ═══ migration 20260731_capacite_par_places.sql ═══

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

-- ── 0. Retrait des anciennes signatures ────────────────────────────────────
-- Les nouvelles fonctions prennent un paramètre p_personnes avec valeur par
-- défaut. Sans ce nettoyage, l'ancienne version et la nouvelle coexistent :
-- un appel à 3 arguments devient ambigu et Postgres refuse de choisir
-- (« function ... is not unique ») — le widget cesserait d'afficher
-- les créneaux.
DROP FUNCTION IF EXISTS creneau_disponibilite(uuid, date, time);
DROP FUNCTION IF EXISTS creneaux_disponibilite(uuid, date);

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


-- ═══ migration 20260731_plan_par_date.sql ═══

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


-- ═══ migration 20260803_plan_par_service.sql ═══

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


-- ═══ migration 20260804_no_show.sql ═══

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


-- ═══ migration 20260805_liste_attente.sql ═══

-- Liste d'attente.
--
-- Quand une date est complète, le client n'a aujourd'hui aucune option :
-- il quitte la page sans laisser de trace, et le restaurant perd une vente
-- possible en cas de désistement. On lui propose de laisser ses
-- coordonnées ; le restaurateur les gère depuis l'onglet Réservations.

CREATE TABLE IF NOT EXISTS liste_attente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  prenom text NOT NULL,
  nom text NOT NULL,
  email text,
  telephone text,
  date date NOT NULL,
  heure time,                      -- créneau souhaité, facultatif (toute la soirée)
  nb_personnes int NOT NULL DEFAULT 2,
  message text,
  statut text NOT NULL DEFAULT 'en_attente',   -- en_attente | placee | annulee
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS liste_attente_resto_date
  ON liste_attente (restaurant_id, date);

ALTER TABLE liste_attente ENABLE ROW LEVEL SECURITY;

-- N'importe qui peut s'inscrire (widget public), mais uniquement en écriture :
-- pas de lecture, sinon on exposerait les coordonnées d'autres clients.
DROP POLICY IF EXISTS "liste_attente insertion publique" ON liste_attente;
CREATE POLICY "liste_attente insertion publique" ON liste_attente
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "liste_attente lecture proprietaire" ON liste_attente;
CREATE POLICY "liste_attente lecture proprietaire" ON liste_attente
  FOR SELECT TO authenticated
  USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
    OR auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid
  );

DROP POLICY IF EXISTS "liste_attente ecriture proprietaire" ON liste_attente;
CREATE POLICY "liste_attente ecriture proprietaire" ON liste_attente
  FOR UPDATE TO authenticated
  USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
    OR auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid
  )
  WITH CHECK (
    restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
    OR auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid
  );

DROP POLICY IF EXISTS "liste_attente suppression proprietaire" ON liste_attente;
CREATE POLICY "liste_attente suppression proprietaire" ON liste_attente
  FOR DELETE TO authenticated
  USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
    OR auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid
  );


-- ═══ migration 20260806_capacite_auto.sql ═══

-- nb_couverts_max (le plus grand groupe qu'un client peut réserver en ligne)
-- était un champ manuel, sans lien avec les tables réellement configurées
-- dans le plan de salle. Un restaurateur qui change ses tables oublie de le
-- remettre à jour, et le menu déroulant public reste faux.
--
-- On calcule désormais nb_couverts_max automatiquement (somme des places du
-- plan de salle) à chaque changement de table, SAUF si le restaurateur l'a
-- explicitement fixé à la main (nb_couverts_max_manuel = true) — certains
-- veulent plafonner en dessous de leur capacité réelle (ex: garder des
-- tables pour les groupes qui appellent directement).
--
-- Par défaut manuel=true pour les restaurants existants : on ne change
-- silencieusement aucune valeur déjà en prod. Le restaurateur active le mode
-- automatique lui-même depuis la Configuration.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS nb_couverts_max_manuel boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION recalculer_nb_couverts_max()
RETURNS trigger AS $$
DECLARE
  rid uuid;
  total int;
BEGIN
  rid := COALESCE(NEW.restaurant_id, OLD.restaurant_id);

  SELECT COALESCE(SUM(capacity), 0) INTO total
    FROM plan_tables WHERE restaurant_id = rid;

  UPDATE restaurants
     SET nb_couverts_max = GREATEST(total, 1)
   WHERE id = rid AND NOT nb_couverts_max_manuel;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS plan_tables_maj_couverts ON plan_tables;
CREATE TRIGGER plan_tables_maj_couverts
  AFTER INSERT OR UPDATE OF capacity OR DELETE ON plan_tables
  FOR EACH ROW EXECUTE FUNCTION recalculer_nb_couverts_max();


-- ═══ migration 20260807_multi_utilisateurs.sql ═══

-- Multi-utilisateurs par restaurant.
--
-- Jusqu'ici, un restaurant = un seul compte (restaurants.user_id). Impossible
-- de donner un accès à un collègue (ex: quelqu'un qui fait des visites
-- commerciales et doit montrer le dashboard) sans partager le mot de passe.
--
-- Les membres ont accès aux fonctionnalités opérationnelles (plan de salle,
-- réservations, liste d'attente, statistiques) au même titre que le
-- propriétaire, mais ne peuvent ni modifier la Configuration du restaurant
-- ni gérer les membres — ça reste réservé au propriétaire, pour éviter
-- qu'un accès de démonstration ne puisse changer le slug ou les horaires.

-- ── 1. Table des membres ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (restaurant_id, user_id)
);

ALTER TABLE restaurant_members ENABLE ROW LEVEL SECURITY;

-- Le propriétaire voit et gère ses membres ; un membre voit sa propre ligne
-- (pour savoir à quel restaurant il est rattaché).
DROP POLICY IF EXISTS "membres lecture" ON restaurant_members;
CREATE POLICY "membres lecture" ON restaurant_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
    OR auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid
  );

DROP POLICY IF EXISTS "membres suppression proprietaire" ON restaurant_members;
CREATE POLICY "membres suppression proprietaire" ON restaurant_members
  FOR DELETE TO authenticated
  USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
    OR auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid
  );
-- Pas de policy INSERT directe : passage obligé par ajouter_membre_par_email()
-- ci-dessous, qui vérifie l'email ET le rôle de propriétaire avant d'insérer.

-- ── 2. Fonction d'accès : propriétaire OU membre OU admin ──────────────────
CREATE OR REPLACE FUNCTION a_acces_restaurant(p_restaurant_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM restaurants
     WHERE id = p_restaurant_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM restaurant_members
     WHERE restaurant_id = p_restaurant_id AND user_id = auth.uid()
  ) OR auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── 3. Restaurant du compte connecté (propriétaire ou membre) ──────────────
-- Remplace les `.eq('user_id', user.id)` du frontend : un membre n'est
-- propriétaire d'aucun restaurant, cette requête ne le trouverait jamais.
CREATE OR REPLACE FUNCTION mon_restaurant_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    (SELECT id FROM restaurants WHERE user_id = auth.uid() LIMIT 1),
    (SELECT restaurant_id FROM restaurant_members WHERE user_id = auth.uid() LIMIT 1)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mon_restaurant_id() TO authenticated;

-- ── 4. Ajouter / lister les membres (réservé au propriétaire) ──────────────
CREATE OR REPLACE FUNCTION ajouter_membre_par_email(p_restaurant_id uuid, p_email text)
RETURNS text AS $$
DECLARE
  cible uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM restaurants WHERE id = p_restaurant_id AND user_id = auth.uid()
  ) AND auth.uid() <> 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid THEN
    RAISE EXCEPTION 'non_autorise';
  END IF;

  SELECT id INTO cible FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
  IF cible IS NULL THEN
    RAISE EXCEPTION 'utilisateur_introuvable';
  END IF;

  INSERT INTO restaurant_members (restaurant_id, user_id)
  VALUES (p_restaurant_id, cible)
  ON CONFLICT (restaurant_id, user_id) DO NOTHING;

  RETURN cible::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION ajouter_membre_par_email(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION lister_membres(p_restaurant_id uuid)
RETURNS TABLE(user_id uuid, email text, created_at timestamptz) AS $$
  SELECT m.user_id, u.email, m.created_at
    FROM restaurant_members m
    JOIN auth.users u ON u.id = m.user_id
   WHERE m.restaurant_id = p_restaurant_id
     AND (
       EXISTS (SELECT 1 FROM restaurants WHERE id = p_restaurant_id AND user_id = auth.uid())
       OR auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid
     )
   ORDER BY m.created_at;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION lister_membres(uuid) TO authenticated;

-- ── 5. Étendre les policies existantes aux membres ──────────────────────────
-- restaurants : lecture ouverte aux membres (pour résoudre mon_restaurant_id
-- côté UI), écriture toujours réservée au propriétaire.
DROP POLICY IF EXISTS "Un utilisateur voit son restaurant" ON restaurants;
CREATE POLICY "Un utilisateur voit son restaurant" ON restaurants
  FOR SELECT USING (a_acces_restaurant(id));

-- horaires
DROP POLICY IF EXISTS "Lecture horaires de son restaurant" ON horaires;
CREATE POLICY "Lecture horaires de son restaurant" ON horaires
  FOR SELECT USING (a_acces_restaurant(restaurant_id));

DROP POLICY IF EXISTS "Insertion horaires de son restaurant" ON horaires;
CREATE POLICY "Insertion horaires de son restaurant" ON horaires
  FOR INSERT WITH CHECK (a_acces_restaurant(restaurant_id));

DROP POLICY IF EXISTS "Suppression horaires de son restaurant" ON horaires;
CREATE POLICY "Suppression horaires de son restaurant" ON horaires
  FOR DELETE USING (a_acces_restaurant(restaurant_id));

-- reservations
DROP POLICY IF EXISTS "Lecture réservations de son restaurant" ON reservations;
CREATE POLICY "Lecture réservations de son restaurant" ON reservations
  FOR SELECT USING (a_acces_restaurant(restaurant_id));

DROP POLICY IF EXISTS "Mise à jour statut par le restaurateur" ON reservations;
CREATE POLICY "Mise à jour statut par le restaurateur" ON reservations
  FOR UPDATE USING (a_acces_restaurant(restaurant_id));

DROP POLICY IF EXISTS "Owner inserts own reservations" ON reservations;
CREATE POLICY "Owner inserts own reservations" ON reservations
  FOR INSERT TO authenticated WITH CHECK (a_acces_restaurant(restaurant_id));

-- plan_tables / table_assignments (policies ALL, un seul USING)
DROP POLICY IF EXISTS owner_plan_tables ON plan_tables;
CREATE POLICY owner_plan_tables ON plan_tables
  FOR ALL USING (a_acces_restaurant(restaurant_id));

DROP POLICY IF EXISTS owner_table_assignments ON table_assignments;
CREATE POLICY owner_table_assignments ON table_assignments
  FOR ALL USING (a_acces_restaurant(restaurant_id));

-- fermetures
DROP POLICY IF EXISTS "fermetures ecriture proprietaire" ON fermetures;
CREATE POLICY "fermetures ecriture proprietaire" ON fermetures
  FOR ALL TO authenticated
  USING (a_acces_restaurant(restaurant_id))
  WITH CHECK (a_acces_restaurant(restaurant_id));

-- liste_attente
DROP POLICY IF EXISTS "liste_attente lecture proprietaire" ON liste_attente;
CREATE POLICY "liste_attente lecture proprietaire" ON liste_attente
  FOR SELECT TO authenticated USING (a_acces_restaurant(restaurant_id));

DROP POLICY IF EXISTS "liste_attente ecriture proprietaire" ON liste_attente;
CREATE POLICY "liste_attente ecriture proprietaire" ON liste_attente
  FOR UPDATE TO authenticated
  USING (a_acces_restaurant(restaurant_id))
  WITH CHECK (a_acces_restaurant(restaurant_id));

DROP POLICY IF EXISTS "liste_attente suppression proprietaire" ON liste_attente;
CREATE POLICY "liste_attente suppression proprietaire" ON liste_attente
  FOR DELETE TO authenticated USING (a_acces_restaurant(restaurant_id));


-- ═══ migration 20260808_role_manager.sql ═══

-- Rôle "manager" : un membre qui peut aussi modifier la Configuration
-- (ex : quelqu'un qui fait des démos commerciales et veut montrer en
-- direct comment on change un horaire), par opposition au membre simple
-- qui ne fait que consulter le dashboard opérationnel.

ALTER TABLE restaurant_members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'membre';

ALTER TABLE restaurant_members
  DROP CONSTRAINT IF EXISTS restaurant_members_role_check;
ALTER TABLE restaurant_members
  ADD CONSTRAINT restaurant_members_role_check CHECK (role IN ('membre', 'manager'));

-- Propriétaire OU membre avec le rôle manager OU admin
CREATE OR REPLACE FUNCTION peut_gerer_restaurant(p_restaurant_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM restaurants
     WHERE id = p_restaurant_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM restaurant_members
     WHERE restaurant_id = p_restaurant_id AND user_id = auth.uid() AND role = 'manager'
  ) OR auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- La Configuration (nom, slug, horaires...) devient modifiable par un manager
DROP POLICY IF EXISTS "Un utilisateur modifie son restaurant" ON restaurants;
CREATE POLICY "Un utilisateur modifie son restaurant" ON restaurants
  FOR UPDATE USING (peut_gerer_restaurant(id));

DROP POLICY IF EXISTS "Insertion horaires de son restaurant" ON horaires;
CREATE POLICY "Insertion horaires de son restaurant" ON horaires
  FOR INSERT WITH CHECK (peut_gerer_restaurant(restaurant_id));

DROP POLICY IF EXISTS "Suppression horaires de son restaurant" ON horaires;
CREATE POLICY "Suppression horaires de son restaurant" ON horaires
  FOR DELETE USING (peut_gerer_restaurant(restaurant_id));

-- Rôle renvoyé par ajouter_membre_par_email() et lister_membres()
-- DROP d'abord : on ajoute un paramètre, CREATE OR REPLACE seul créerait une
-- surcharge (deux fonctions du même nom) au lieu de remplacer l'existante,
-- ce qui rendrait un appel à 2 arguments ambigu.
DROP FUNCTION IF EXISTS ajouter_membre_par_email(uuid, text);
CREATE OR REPLACE FUNCTION ajouter_membre_par_email(p_restaurant_id uuid, p_email text, p_role text DEFAULT 'membre')
RETURNS text AS $$
DECLARE
  cible uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM restaurants WHERE id = p_restaurant_id AND user_id = auth.uid()
  ) AND auth.uid() <> 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid THEN
    RAISE EXCEPTION 'non_autorise';
  END IF;

  IF p_role NOT IN ('membre', 'manager') THEN
    RAISE EXCEPTION 'role_invalide';
  END IF;

  SELECT id INTO cible FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
  IF cible IS NULL THEN
    RAISE EXCEPTION 'utilisateur_introuvable';
  END IF;

  INSERT INTO restaurant_members (restaurant_id, user_id, role)
  VALUES (p_restaurant_id, cible, p_role)
  ON CONFLICT (restaurant_id, user_id) DO UPDATE SET role = p_role;

  RETURN cible::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION ajouter_membre_par_email(uuid, text, text) TO authenticated;

-- DROP d'abord : le type de retour change (ajout de `role`), Postgres
-- refuse un CREATE OR REPLACE qui modifierait la forme des colonnes.
DROP FUNCTION IF EXISTS lister_membres(uuid);
CREATE OR REPLACE FUNCTION lister_membres(p_restaurant_id uuid)
RETURNS TABLE(user_id uuid, email text, role text, created_at timestamptz) AS $$
  SELECT m.user_id, u.email, m.role, m.created_at
    FROM restaurant_members m
    JOIN auth.users u ON u.id = m.user_id
   WHERE m.restaurant_id = p_restaurant_id
     AND (
       EXISTS (SELECT 1 FROM restaurants WHERE id = p_restaurant_id AND user_id = auth.uid())
       OR auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid
     )
   ORDER BY m.created_at;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION lister_membres(uuid) TO authenticated;

-- Le rôle du compte connecté sur un restaurant donné (utilisé par le
-- frontend pour savoir s'il doit afficher la Configuration éditable).
CREATE OR REPLACE FUNCTION mon_role(p_restaurant_id uuid)
RETURNS text AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM restaurants WHERE id = p_restaurant_id AND user_id = auth.uid())
      THEN 'proprietaire'
    ELSE (SELECT role FROM restaurant_members WHERE restaurant_id = p_restaurant_id AND user_id = auth.uid())
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mon_role(uuid) TO authenticated;


-- ═══ migration 20260809_retrait_membre_propre.sql ═══

-- Retirer un membre laissait traîner ses notifications push pour ce
-- restaurant : send-push interroge push_subscriptions par restaurant_id
-- seul, sans vérifier l'appartenance à restaurant_members. Un ex-membre
-- continuait donc à recevoir une alerte à chaque nouvelle réservation.
--
-- La RLS sur push_subscriptions n'autorise chacun qu'à gérer ses propres
-- abonnements (user_id = auth.uid()) : le propriétaire ne peut pas supprimer
-- directement celui d'un membre qu'il retire, d'où ce passage par une
-- fonction SECURITY DEFINER.

CREATE OR REPLACE FUNCTION retirer_membre(p_restaurant_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM restaurants WHERE id = p_restaurant_id AND user_id = auth.uid()
  ) AND auth.uid() <> 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid THEN
    RAISE EXCEPTION 'non_autorise';
  END IF;

  DELETE FROM restaurant_members WHERE restaurant_id = p_restaurant_id AND user_id = p_user_id;
  DELETE FROM push_subscriptions WHERE restaurant_id = p_restaurant_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION retirer_membre(uuid, uuid) TO authenticated;


-- ═══ migration 20260810_photos_menu.sql ═══

-- Page publique plus visuelle : photos du restaurant + menu.
--
-- Jusqu'ici la page de réservation publique n'affichait que du texte
-- (nom, adresse, description) : rien qui donne envie de réserver avant
-- même d'avoir vu la salle ou l'assiette. C'est le plus gros écart avec
-- TheFork identifié côté conversion client.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS menu_url text;


-- ═══ migration 20260811_storage_widget_images.sql ═══

-- Policies du bucket Storage "widget-images" (photo de fond, galerie,
-- menu). Le bucket lui-même doit être créé à la main dans Supabase
-- Studio → Storage → New bucket → "widget-images" → Public bucket coché
-- (impossible de créer un bucket par migration SQL) ; ce script ne fait
-- que poser les règles d'accès dessus.

DROP POLICY IF EXISTS "widget-images lecture publique" ON storage.objects;
CREATE POLICY "widget-images lecture publique" ON storage.objects
  FOR SELECT USING (bucket_id = 'widget-images');

DROP POLICY IF EXISTS "widget-images envoi authentifie" ON storage.objects;
CREATE POLICY "widget-images envoi authentifie" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'widget-images');

DROP POLICY IF EXISTS "widget-images remplacement authentifie" ON storage.objects;
CREATE POLICY "widget-images remplacement authentifie" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'widget-images');

DROP POLICY IF EXISTS "widget-images suppression authentifie" ON storage.objects;
CREATE POLICY "widget-images suppression authentifie" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'widget-images');


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
