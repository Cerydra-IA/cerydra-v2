ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS widget_primary_color  text DEFAULT '#1a1a2e',
  ADD COLUMN IF NOT EXISTS widget_bg_color       text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS widget_button_text    text DEFAULT 'Confirmer la réservation',
  ADD COLUMN IF NOT EXISTS widget_bg_image_url   text DEFAULT NULL;
