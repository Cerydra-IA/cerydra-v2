-- Politiques RLS admin pour contact@cerydra.fr
-- Les politiques existantes (filtre par user_id) restent actives pour les autres utilisateurs.

-- ============================================================
-- TABLE: restaurants
-- ============================================================

CREATE POLICY "Admin reads all restaurants"
ON restaurants FOR SELECT TO authenticated
USING (auth.jwt() ->> 'email' = 'contact@cerydra.fr');

CREATE POLICY "Admin inserts restaurants"
ON restaurants FOR INSERT TO authenticated
WITH CHECK (auth.jwt() ->> 'email' = 'contact@cerydra.fr');

CREATE POLICY "Admin updates all restaurants"
ON restaurants FOR UPDATE TO authenticated
USING (auth.jwt() ->> 'email' = 'contact@cerydra.fr')
WITH CHECK (auth.jwt() ->> 'email' = 'contact@cerydra.fr');

CREATE POLICY "Admin deletes all restaurants"
ON restaurants FOR DELETE TO authenticated
USING (auth.jwt() ->> 'email' = 'contact@cerydra.fr');

-- ============================================================
-- TABLE: reservations
-- ============================================================

CREATE POLICY "Admin reads all reservations"
ON reservations FOR SELECT TO authenticated
USING (auth.jwt() ->> 'email' = 'contact@cerydra.fr');

CREATE POLICY "Admin inserts reservations"
ON reservations FOR INSERT TO authenticated
WITH CHECK (auth.jwt() ->> 'email' = 'contact@cerydra.fr');

CREATE POLICY "Admin updates all reservations"
ON reservations FOR UPDATE TO authenticated
USING (auth.jwt() ->> 'email' = 'contact@cerydra.fr')
WITH CHECK (auth.jwt() ->> 'email' = 'contact@cerydra.fr');

CREATE POLICY "Admin deletes all reservations"
ON reservations FOR DELETE TO authenticated
USING (auth.jwt() ->> 'email' = 'contact@cerydra.fr');
