-- Page publique plus visuelle : photos du restaurant + menu.
--
-- Jusqu'ici la page de réservation publique n'affichait que du texte
-- (nom, adresse, description) : rien qui donne envie de réserver avant
-- même d'avoir vu la salle ou l'assiette. C'est le plus gros écart avec
-- TheFork identifié côté conversion client.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS menu_url text;
