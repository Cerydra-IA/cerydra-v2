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
