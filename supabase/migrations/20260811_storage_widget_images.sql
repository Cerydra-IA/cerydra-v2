-- Policies du bucket Storage "widget-images" (photo de fond, galerie,
-- menu). Le bucket lui-même doit être créé à la main dans Supabase
-- Studio → Storage → New bucket → "widget-images" → Public bucket coché
-- (impossible de créer un bucket par migration SQL) ; ce script ne fait
-- que poser les règles d'accès dessus.

DROP POLICY IF EXISTS "widget-images lecture publique" ON storage.objects;
CREATE POLICY "widget-images lecture publique" ON storage.objects
  FOR SELECT USING (bucket_id = 'widget-images');

DROP POLICY IF EXISTS "widget-images envoi authentifie" ON storage.objects;
CREATE POLICY "widget-images envoi authentifie" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'widget-images');

DROP POLICY IF EXISTS "widget-images remplacement authentifie" ON storage.objects;
CREATE POLICY "widget-images remplacement authentifie" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'widget-images');

DROP POLICY IF EXISTS "widget-images suppression authentifie" ON storage.objects;
CREATE POLICY "widget-images suppression authentifie" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'widget-images');
