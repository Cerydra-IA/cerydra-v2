-- Ajoute le champ reminder_sent à la table reservations
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;

-- Index pour accélérer la requête du cron (filtre sur date + reminder_sent + statut)
CREATE INDEX IF NOT EXISTS idx_reservations_reminder
  ON reservations (date, reminder_sent, statut);
