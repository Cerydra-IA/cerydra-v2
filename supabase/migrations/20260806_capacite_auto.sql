-- nb_couverts_max (le plus grand groupe qu'un client peut réserver en ligne)
-- était un champ manuel, sans lien avec les tables réellement configurées
-- dans le plan de salle. Un restaurateur qui change ses tables oublie de le
-- remettre à jour, et le menu déroulant public reste faux.
--
-- On calcule désormais nb_couverts_max automatiquement (somme des places du
-- plan de salle) à chaque changement de table, SAUF si le restaurateur l'a
-- explicitement fixé à la main (nb_couverts_max_manuel = true) — certains
-- veulent plafonner en dessous de leur capacité réelle (ex: garder des
-- tables pour les groupes qui appellent directement).
--
-- Par défaut manuel=true pour les restaurants existants : on ne change
-- silencieusement aucune valeur déjà en prod. Le restaurateur active le mode
-- automatique lui-même depuis la Configuration.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS nb_couverts_max_manuel boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION recalculer_nb_couverts_max()
RETURNS trigger AS $$
DECLARE
  rid uuid;
  total int;
BEGIN
  rid := COALESCE(NEW.restaurant_id, OLD.restaurant_id);

  SELECT COALESCE(SUM(capacity), 0) INTO total
    FROM plan_tables WHERE restaurant_id = rid;

  UPDATE restaurants
     SET nb_couverts_max = GREATEST(total, 1)
   WHERE id = rid AND NOT nb_couverts_max_manuel;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS plan_tables_maj_couverts ON plan_tables;
CREATE TRIGGER plan_tables_maj_couverts
  AFTER INSERT OR UPDATE OF capacity OR DELETE ON plan_tables
  FOR EACH ROW EXECUTE FUNCTION recalculer_nb_couverts_max();
