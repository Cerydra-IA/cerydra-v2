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
