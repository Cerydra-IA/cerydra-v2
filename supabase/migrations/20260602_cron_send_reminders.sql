-- Active les extensions nécessaires (déjà disponibles sur Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Supprime le job s'il existe déjà (idempotent)
SELECT cron.unschedule('send-reminders-hourly')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-reminders-hourly'
  );

-- Planifie l'appel à l'Edge Function toutes les heures
SELECT cron.schedule(
  'send-reminders-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := '{}'::jsonb
  );
  $$
);
