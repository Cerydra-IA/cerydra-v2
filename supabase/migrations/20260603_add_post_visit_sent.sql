-- Ajoute le champ post_visit_sent à la table reservations
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS post_visit_sent boolean NOT NULL DEFAULT false;

-- Index pour accélérer la requête du cron
CREATE INDEX IF NOT EXISTS idx_reservations_post_visit
  ON reservations (date, post_visit_sent, statut);
