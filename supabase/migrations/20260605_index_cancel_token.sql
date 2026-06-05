-- Index sur le token d'annulation pour éviter le scan linéaire à chaque annulation
CREATE INDEX IF NOT EXISTS idx_reservations_token
  ON reservations (token)
  WHERE token IS NOT NULL;
