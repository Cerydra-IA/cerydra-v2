-- Bug : un email d'annulation partait en même temps que l'email de rappel 24h.
--
-- Cause : le trigger `annulation_reservation` (webhook Make) était déclaré
-- AFTER UPDATE ... FOR EACH ROW sans clause WHEN. Il partait donc sur *tout*
-- UPDATE de la table reservations, notamment :
--   - send-reminders   → UPDATE ... SET reminder_sent = true
--   - send-post-visit  → UPDATE ... SET post_visit_sent = true
--   - le bouton « Confirmer » du dashboard
--
-- Fix : ajouter une condition WHEN pour ne notifier Make que lorsque le statut
-- bascule effectivement vers 'annulée'. Le bloc récupère la définition
-- existante du trigger (URL du webhook incluse) et la recrée avec la condition,
-- ce qui évite d'écrire l'URL secrète dans le dépôt.

DO $$
DECLARE def text; newdef text;
BEGIN
  SELECT pg_get_triggerdef(t.oid) INTO def
  FROM pg_trigger t
  WHERE t.tgname = 'annulation_reservation'
    AND t.tgrelid = 'public.reservations'::regclass;

  IF def IS NULL THEN
    RAISE EXCEPTION 'trigger annulation_reservation introuvable';
  END IF;

  IF def LIKE '%WHEN%' THEN
    RAISE NOTICE 'condition déjà présente, rien à faire';
    RETURN;
  END IF;

  newdef := replace(def, 'EXECUTE FUNCTION',
    'WHEN (OLD.statut IS DISTINCT FROM NEW.statut AND NEW.statut = ''annulée'') EXECUTE FUNCTION');

  DROP TRIGGER annulation_reservation ON public.reservations;
  EXECUTE newdef;
END $$;

-- Vérification :
--   select pg_get_triggerdef(oid) from pg_trigger where tgname = 'annulation_reservation';
-- doit contenir : WHEN (((old.statut IS DISTINCT FROM new.statut) AND (new.statut = 'annulée')))
