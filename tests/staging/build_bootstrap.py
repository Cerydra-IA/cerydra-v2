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

def decouper_instructions(sql):
    """
    Découpe le SQL en instructions.

    Un simple split sur les lignes vides ou les « ; » ne marche pas : les corps
    de fonctions contiennent les deux, entre délimiteurs $function$ … $function$.
    On suit donc l'état du délimiteur. Particularité du dump : les définitions
    de fonctions ne se terminent pas par « ; » (pg_get_functiondef n'en met
    pas) — on ferme donc l'instruction sur le délimiteur de fin.
    """
    instructions, courante = [], []
    i, n, tag = 0, len(sql), None
    while i < n:
        if tag:
            if sql.startswith(tag, i):
                courante.append(tag)
                i += len(tag)
                tag = None
                texte = ''.join(courante).lstrip()
                if re.match(r'CREATE\s+(OR\s+REPLACE\s+)?FUNCTION', texte, re.I):
                    instructions.append(texte.strip() + ';')
                    courante = []
                continue
            courante.append(sql[i]); i += 1
            continue
        m = re.match(r'\$[A-Za-z_]*\$', sql[i:])
        if m:
            tag = m.group(0)
            courante.append(tag)
            i += len(tag)
            continue
        if sql[i] == ';':
            courante.append(';')
            instructions.append(''.join(courante).strip())
            courante = []
            i += 1
            continue
        courante.append(sql[i]); i += 1
    if ''.join(courante).strip():
        instructions.append(''.join(courante).strip())
    return [x for x in instructions if x.strip(';').strip()]


src = open(DUMP, encoding='utf-8').read()
# L'export CSV a doublé les sauts de ligne : on les remet à un
src = re.sub(r'\n{3,}', '\n\n', src.replace('\r\n', '\n'))
src = re.sub(r'\n\n(?=\s*(declare|begin|end|if|else|return|set|where|and|select|update|from|values|create|alter)\b)',
             '\n', src, flags=re.I)
blocs = decouper_instructions(src)

gardes, retires = [], []
for b in blocs:
    # retire toutes les lignes de commentaire ET les lignes vides en tête,
    # sinon un bloc précédé de plusieurs commentaires séparés serait jeté
    b = re.sub(r'^(?:[ \t]*(?:--[^\n]*)?\n)+', '', b).strip()
    if not b or b.startswith('--'):
        continue
    # On retire tout ce qui sort du staging vers l'extérieur
    if 'http_request' in b or 'hook.eu1.make.com' in b or '/functions/v1/' in b:
        retires.append(b.split('\n')[0][:80])
        continue
    if b.startswith(('CREATE TABLE', 'ALTER TABLE', 'CREATE INDEX', 'CREATE UNIQUE INDEX',
                     'CREATE OR REPLACE FUNCTION', 'CREATE FUNCTION', 'CREATE TRIGGER')):
        gardes.append(b)

# Le dump ne garantit pas l'ordre à l'intérieur d'une catégorie : une clé
# étrangère pouvait être créée avant la clé primaire qu'elle référence.
# On réordonne : tables → PK/UNIQUE/CHECK → clés étrangères → le reste.
def rang(b):
    if b.startswith('CREATE TABLE'):
        return 0
    if 'ADD CONSTRAINT' in b:
        return 2 if 'FOREIGN KEY' in b else 1
    return 3

gardes.sort(key=rang)

# Idempotence : les tables et contraintes peuvent déjà exister
out = []
for b in gardes:
    if b.startswith('CREATE TABLE public.'):
        b = b.replace('CREATE TABLE public.', 'CREATE TABLE IF NOT EXISTS public.', 1)
    if b.startswith('ALTER TABLE') and 'ADD CONSTRAINT' in b:
        nom = re.search(r'ADD CONSTRAINT (\S+)', b)
        if nom:
            # rejouable : on n'ajoute la contrainte que si elle n'existe pas
            b = (f"DO $$ BEGIN\n"
                 f"  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '{nom.group(1)}') THEN\n"
                 f"    {b}\n"
                 f"  END IF;\n"
                 f"END $$;")
    # Le dump liste aussi les index qui portent les contraintes : ils existent
    # déjà après la création de la PK/UNIQUE, d'où le IF NOT EXISTS.
    if b.startswith('CREATE INDEX '):
        b = b.replace('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS ', 1)
    if b.startswith('CREATE UNIQUE INDEX '):
        b = b.replace('CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS ', 1)
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
    '20260730_creneaux_du_jour.sql',
    '20260731_capacite_par_places.sql',
    '20260731_plan_par_date.sql',
    '20260803_plan_par_service.sql',
    '20260804_no_show.sql',
    '20260805_liste_attente.sql',
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
