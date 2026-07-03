-- Schéma complet CERYDRA (version expurgée pour git)
-- Les secrets <SERVICE_ROLE_KEY> et <WEBHOOK_MAKE> sont dans la sauvegarde
-- hors repo : SCHEMA_COMPLET_AVEC_SECRETS.sql (clé USB / gestionnaire de mots de passe).

-- SCHEMA CERYDRA — dump du 2026-07-03

CREATE TABLE public.restaurants (
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

CREATE TABLE public.horaires (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  restaurant_id uuid,
  jour text,
  ouvert boolean DEFAULT true,
  midi_debut time without time zone,
  midi_fin time without time zone,
  soir_debut time without time zone,
  soir_fin time without time zone
);

CREATE TABLE public.reservations (
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

CREATE TABLE public.plan_tables (
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

CREATE TABLE public.table_assignments (
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

CREATE TABLE public.push_subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  restaurant_id uuid,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.fermetures (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  restaurant_id uuid NOT NULL,
  date date NOT NULL,
  motif text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE fermetures ADD CONSTRAINT fermetures_pkey PRIMARY KEY (id);

ALTER TABLE fermetures ADD CONSTRAINT fermetures_restaurant_id_date_key UNIQUE (restaurant_id, date);

ALTER TABLE fermetures ADD CONSTRAINT fermetures_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE horaires ADD CONSTRAINT horaires_pkey PRIMARY KEY (id);

ALTER TABLE horaires ADD CONSTRAINT horaires_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);

ALTER TABLE plan_tables ADD CONSTRAINT plan_tables_pkey PRIMARY KEY (id);

ALTER TABLE plan_tables ADD CONSTRAINT plan_tables_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);

ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE reservations ADD CONSTRAINT reservations_cancel_token_key UNIQUE (cancel_token);

ALTER TABLE reservations ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);

ALTER TABLE reservations ADD CONSTRAINT reservations_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);

ALTER TABLE restaurants ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);

ALTER TABLE restaurants ADD CONSTRAINT restaurants_slug_key UNIQUE (slug);

ALTER TABLE restaurants ADD CONSTRAINT restaurants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE table_assignments ADD CONSTRAINT table_assignments_pkey PRIMARY KEY (id);

ALTER TABLE table_assignments ADD CONSTRAINT table_assignments_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL;

ALTER TABLE table_assignments ADD CONSTRAINT table_assignments_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE table_assignments ADD CONSTRAINT table_assignments_table_id_fkey FOREIGN KEY (table_id) REFERENCES plan_tables(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX horaires_pkey ON public.horaires USING btree (id);

CREATE UNIQUE INDEX reservations_pkey ON public.reservations USING btree (id);

CREATE UNIQUE INDEX reservations_cancel_token_key ON public.reservations USING btree (cancel_token);

CREATE INDEX idx_reservations_reminder ON public.reservations USING btree (date, reminder_sent, statut);

CREATE INDEX idx_reservations_cancel_token ON public.reservations USING btree (cancel_token) WHERE (cancel_token IS NOT NULL);

CREATE UNIQUE INDEX restaurants_pkey ON public.restaurants USING btree (id);

CREATE UNIQUE INDEX restaurants_slug_key ON public.restaurants USING btree (slug);

CREATE UNIQUE INDEX plan_tables_pkey ON public.plan_tables USING btree (id);

CREATE UNIQUE INDEX table_assignments_pkey ON public.table_assignments USING btree (id);

CREATE UNIQUE INDEX push_subscriptions_pkey ON public.push_subscriptions USING btree (id);

CREATE UNIQUE INDEX push_subscriptions_endpoint_key ON public.push_subscriptions USING btree (endpoint);

CREATE UNIQUE INDEX fermetures_pkey ON public.fermetures USING btree (id);

CREATE UNIQUE INDEX fermetures_restaurant_id_date_key ON public.fermetures USING btree (restaurant_id, date);

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

$function$


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

$function$


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

$function$


CREATE TRIGGER nouvelle_reservation AFTER INSERT ON public.reservations FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://hook.eu1.make.com/<WEBHOOK_MAKE>', 'POST', '{"Content-type":"application/json"}', '{}', '5000');

CREATE TRIGGER annulation_reservation AFTER UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://hook.eu1.make.com/<WEBHOOK_MAKE>', 'POST', '{"Content-type":"application/json"}', '{}', '5000');

CREATE TRIGGER " on-new-reservation" AFTER INSERT ON public.reservations FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://wuyltmbakpcvimqspqnb.supabase.co/functions/v1/hyper-function', 'POST', '{"Content-type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}', '{}', '5000');

CREATE TRIGGER trg_validate_reservation BEFORE INSERT ON public.reservations FOR EACH ROW EXECUTE FUNCTION validate_reservation();

ALTER TABLE public.horaires ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.plan_tables ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.table_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fermetures ENABLE ROW LEVEL SECURITY;

-- POLICY "Un utilisateur voit son restaurant" ON restaurants | SELECT | roles: public
--   USING: (auth.uid() = user_id)
--   CHECK: —

-- POLICY "Un utilisateur crée son restaurant" ON restaurants | INSERT | roles: public
--   USING: —
--   CHECK: (auth.uid() = user_id)

-- POLICY "Un utilisateur modifie son restaurant" ON restaurants | UPDATE | roles: public
--   USING: (auth.uid() = user_id)
--   CHECK: —

-- POLICY "Lecture horaires de son restaurant" ON horaires | SELECT | roles: public
--   USING: (EXISTS ( SELECT 1
   FROM restaurants
  WHERE ((restaurants.id = horaires.restaurant_id) AND (restaurants.user_id = auth.uid()))))
--   CHECK: —

-- POLICY "Insertion horaires de son restaurant" ON horaires | INSERT | roles: public
--   USING: —
--   CHECK: (EXISTS ( SELECT 1
   FROM restaurants
  WHERE ((restaurants.id = horaires.restaurant_id) AND (restaurants.user_id = auth.uid()))))

-- POLICY "Suppression horaires de son restaurant" ON horaires | DELETE | roles: public
--   USING: (EXISTS ( SELECT 1
   FROM restaurants
  WHERE ((restaurants.id = horaires.restaurant_id) AND (restaurants.user_id = auth.uid()))))
--   CHECK: —

-- POLICY "Lecture publique restaurant par slug" ON restaurants | SELECT | roles: public
--   USING: true
--   CHECK: —

-- POLICY "Lecture publique horaires" ON horaires | SELECT | roles: public
--   USING: true
--   CHECK: —

-- POLICY "Lecture réservations de son restaurant" ON reservations | SELECT | roles: public
--   USING: (EXISTS ( SELECT 1
   FROM restaurants
  WHERE ((restaurants.id = reservations.restaurant_id) AND (restaurants.user_id = auth.uid()))))
--   CHECK: —

-- POLICY "Tout le monde peut créer une réservation" ON reservations | INSERT | roles: public
--   USING: —
--   CHECK: true

-- POLICY "Mise à jour statut par le restaurateur" ON reservations | UPDATE | roles: public
--   USING: (EXISTS ( SELECT 1
   FROM restaurants
  WHERE ((restaurants.id = reservations.restaurant_id) AND (restaurants.user_id = auth.uid()))))
--   CHECK: —

-- POLICY "Admin deletes all reservations" ON reservations | DELETE | roles: authenticated
--   USING: (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid)
--   CHECK: —

-- POLICY "Admin reads all restaurants" ON restaurants | SELECT | roles: authenticated
--   USING: (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid)
--   CHECK: —

-- POLICY "Admin inserts restaurants" ON restaurants | INSERT | roles: authenticated
--   USING: —
--   CHECK: (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid)

-- POLICY "Admin updates all restaurants" ON restaurants | UPDATE | roles: authenticated
--   USING: (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid)
--   CHECK: (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid)

-- POLICY "Admin deletes all restaurants" ON restaurants | DELETE | roles: authenticated
--   USING: (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid)
--   CHECK: —

-- POLICY "Admin reads all reservations" ON reservations | SELECT | roles: authenticated
--   USING: (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid)
--   CHECK: —

-- POLICY "Admin inserts reservations" ON reservations | INSERT | roles: authenticated
--   USING: —
--   CHECK: (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid)

-- POLICY "Admin updates all reservations" ON reservations | UPDATE | roles: authenticated
--   USING: (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid)
--   CHECK: (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid)

-- POLICY owner_plan_tables ON plan_tables | ALL | roles: public
--   USING: (restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.user_id = auth.uid())))
--   CHECK: —

-- POLICY owner_table_assignments ON table_assignments | ALL | roles: public
--   USING: (restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.user_id = auth.uid())))
--   CHECK: —

-- POLICY owner ON push_subscriptions | ALL | roles: public
--   USING: (user_id = auth.uid())
--   CHECK: (user_id = auth.uid())

-- POLICY "fermetures lecture publique" ON fermetures | SELECT | roles: public
--   USING: true
--   CHECK: —

-- POLICY "fermetures ecriture proprietaire" ON fermetures | ALL | roles: authenticated
--   USING: ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.user_id = auth.uid()))) OR (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid))
--   CHECK: ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.user_id = auth.uid()))) OR (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid))

-- POLICY "Owner inserts own reservations" ON reservations | INSERT | roles: authenticated
--   USING: —
--   CHECK: (restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.user_id = auth.uid())))
