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
