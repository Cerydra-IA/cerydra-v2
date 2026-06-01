-- Politiques RLS admin pour contact@cerydra.fr (uid: e46a1351-987d-411f-8b8c-1ab91ee2f09f)
-- Les politiques existantes (filtre par user_id) restent actives pour les autres utilisateurs.

-- ============================================================
-- TABLE: restaurants
-- ============================================================

DROP POLICY IF EXISTS "Admin reads all restaurants" ON restaurants;
DROP POLICY IF EXISTS "Admin inserts restaurants" ON restaurants;
DROP POLICY IF EXISTS "Admin updates all restaurants" ON restaurants;
DROP POLICY IF EXISTS "Admin deletes all restaurants" ON restaurants;

CREATE POLICY "Admin reads all restaurants"
ON restaurants FOR SELECT TO authenticated
USING (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid);

CREATE POLICY "Admin inserts restaurants"
ON restaurants FOR INSERT TO authenticated
WITH CHECK (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid);

CREATE POLICY "Admin updates all restaurants"
ON restaurants FOR UPDATE TO authenticated
USING (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid)
WITH CHECK (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid);

CREATE POLICY "Admin deletes all restaurants"
ON restaurants FOR DELETE TO authenticated
USING (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid);

-- ============================================================
-- TABLE: reservations
-- ============================================================

DROP POLICY IF EXISTS "Admin reads all reservations" ON reservations;
DROP POLICY IF EXISTS "Admin inserts reservations" ON reservations;
DROP POLICY IF EXISTS "Admin updates all reservations" ON reservations;
DROP POLICY IF EXISTS "Admin deletes all reservations" ON reservations;

CREATE POLICY "Admin reads all reservations"
ON reservations FOR SELECT TO authenticated
USING (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid);

CREATE POLICY "Admin inserts reservations"
ON reservations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid);

CREATE POLICY "Admin updates all reservations"
ON reservations FOR UPDATE TO authenticated
USING (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid)
WITH CHECK (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid);

CREATE POLICY "Admin deletes all reservations"
ON reservations FOR DELETE TO authenticated
USING (auth.uid() = 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid);
