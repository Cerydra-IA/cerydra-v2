# -*- coding: utf-8 -*-
"""
Génère le script d'initialisation de l'environnement de staging à partir du
dump du schéma de production.

Différence essentielle avec la prod : **aucun webhook**. Les triggers qui
appellent Make (emails) et l'Edge Function de notification push sont retirés,
pour que le staging ne puisse jamais rien envoyer à personne — c'est ce qui
permet d'y lancer des simulations de trafic sans réveiller le téléphone.

Usage :  python tests/staging/build_bootstrap.py
Sortie :  tests/staging/01_bootstrap.sql
"""
import os
import re

RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DUMP = os.path.join(RACINE, 'supabase', 'schema_complet.sql')
SORTIE = os.path.join(RACINE, 'tests', 'staging', '01_bootstrap.sql')

src = open(DUMP, encoding='utf-8').read()
blocs = [b.strip() for b in src.split('\n\n') if b.strip()]

gardes, retires = [], []
for b in blocs:
    if b.startswith('--'):
        continue
    # On retire tout ce qui sort du staging vers l'extérieur
    if 'http_request' in b or 'hook.eu1.make.com' in b or '/functions/v1/' in b:
        retires.append(b.split('\n')[0][:80])
        continue
    if b.startswith(('CREATE TABLE', 'ALTER TABLE', 'CREATE INDEX', 'CREATE UNIQUE INDEX',
                     'CREATE OR REPLACE FUNCTION', 'CREATE FUNCTION', 'CREATE TRIGGER')):
        gardes.append(b)

# Idempotence : les tables et contraintes peuvent déjà exister
out = []
for b in gardes:
    if b.startswith('CREATE TABLE public.'):
        b = b.replace('CREATE TABLE public.', 'CREATE TABLE IF NOT EXISTS public.', 1)
    if b.startswith('ALTER TABLE') and 'ADD CONSTRAINT' in b:
        nom = re.search(r'ADD CONSTRAINT (\S+)', b)
        table = re.search(r'ALTER TABLE (\S+)', b)
        if nom and table:
            b = (f"DO $$ BEGIN\n  {b}\nEXCEPTION WHEN duplicate_table OR duplicate_object "
                 f"THEN NULL; END $$;")
    if b.startswith('CREATE TRIGGER'):
        nom = re.search(r'CREATE TRIGGER (\S+)', b).group(1)
        b = f"DROP TRIGGER IF EXISTS {nom} ON public.reservations;\n{b}"
    out.append(b)

entete = """-- ═══════════════════════════════════════════════════════════════════════════
-- CERYDRA — initialisation de l'environnement de STAGING
--
-- ⚠️  À exécuter dans le SQL Editor du projet **cerydra-staging** uniquement.
--
-- Généré par tests/staging/build_bootstrap.py à partir du schéma de production.
-- Les triggers d'envoi (webhooks Make, notification push) sont volontairement
-- ABSENTS : le staging ne doit jamais envoyer d'email ni de notification.
--
-- Ensuite : 02_seed.sql (restaurant de test) puis npm run simulate.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

"""

pied = """

-- ── Politiques RLS ──────────────────────────────────────────────────────────
ALTER TABLE restaurants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE horaires          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tables       ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fermetures        ENABLE ROW LEVEL SECURITY;

-- Lecture publique de ce dont le widget a besoin
DROP POLICY IF EXISTS "Lecture publique restaurant" ON restaurants;
CREATE POLICY "Lecture publique restaurant" ON restaurants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lecture publique horaires" ON horaires;
CREATE POLICY "Lecture publique horaires" ON horaires FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lecture publique fermetures" ON fermetures;
CREATE POLICY "Lecture publique fermetures" ON fermetures FOR SELECT USING (true);

-- Création de réservation ouverte (widget), mais aucune lecture publique
DROP POLICY IF EXISTS "Creation reservation" ON reservations;
CREATE POLICY "Creation reservation" ON reservations FOR INSERT WITH CHECK (true);

-- Le propriétaire gère son restaurant
DROP POLICY IF EXISTS "Proprietaire lit ses reservations" ON reservations;
CREATE POLICY "Proprietaire lit ses reservations" ON reservations
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Proprietaire modifie ses reservations" ON reservations;
CREATE POLICY "Proprietaire modifie ses reservations" ON reservations
  FOR UPDATE TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Proprietaire supprime ses reservations" ON reservations;
CREATE POLICY "Proprietaire supprime ses reservations" ON reservations
  FOR DELETE TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Proprietaire gere son restaurant" ON restaurants;
CREATE POLICY "Proprietaire gere son restaurant" ON restaurants
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Proprietaire gere ses horaires" ON horaires;
CREATE POLICY "Proprietaire gere ses horaires" ON horaires
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Proprietaire gere son plan" ON plan_tables;
CREATE POLICY "Proprietaire gere son plan" ON plan_tables
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Proprietaire gere ses assignations" ON table_assignments;
CREATE POLICY "Proprietaire gere ses assignations" ON table_assignments
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Proprietaire gere ses fermetures" ON fermetures;
CREATE POLICY "Proprietaire gere ses fermetures" ON fermetures
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

-- ── Job de libération des tables ────────────────────────────────────────────
SELECT cron.unschedule('liberer-tables-expirees')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'liberer-tables-expirees');
SELECT cron.schedule('liberer-tables-expirees', '*/15 * * * *',
  $$SELECT liberer_tables_expirees();$$);

SELECT '✅ staging prêt — aucun webhook actif' AS resultat;
"""

# ── Migrations postérieures au dump ────────────────────────────────────────
# Le dump du schéma est une photo à un instant T : on rejoue par-dessus les
# migrations plus récentes pour que le staging soit strictement identique à la
# production. (Le correctif du trigger d'annulation est exclu : ce trigger
# n'existe pas en staging, puisqu'on n'y veut aucun webhook.)
MIGRATIONS_APRES_DUMP = [
    '20260703_capacite_creneaux.sql',
    '20260703_derniere_arrivee.sql',
    '20260703_fermetures_walkins_manuel.sql',
    '20260708_plan_statuts_temporels.sql',
    '20260708_creneau_disponibilite.sql',
]

suite = []
for nom in MIGRATIONS_APRES_DUMP:
    chemin = os.path.join(RACINE, 'supabase', 'migrations', nom)
    if not os.path.exists(chemin):
        raise SystemExit('migration introuvable : ' + nom)
    contenu = open(chemin, encoding='utf-8').read()
    suite.append('-- ═══ migration ' + nom + ' ═══\n\n' + contenu)

corps = '\n\n'.join(out) + '\n\n\n' + '\n\n'.join(suite)

open(SORTIE, 'w', encoding='utf-8').write(entete + corps + pied)
print(str(len(out)) + " blocs conserves -> tests/staging/01_bootstrap.sql")
print(str(len(retires)) + " triggers d'envoi retires :")
for r in retires:
    print('   -', r)
