-- Fichier client : vue agrégée par email, pensée pour la relance plutôt
-- qu'une simple liste de contacts (cf. discussion produit — l'angle qui
-- transforme Cerydra d'"outil de réservation" en "outil qui fait gagner
-- du chiffre d'affaires").
--
-- Segment calculé côté frontend à partir de nb_visites/derniere_visite
-- (nouveau / fidèle / à relancer) : la fonction ne renvoie que les faits,
-- pas de jugement, pour rester facile à ajuster sans migration.
--
-- "Visite" = réservation confirmée dont la date est déjà passée (honorée).
-- Une confirmée future n'est pas encore une visite ; un no-show n'en est
-- jamais une (le client n'est pas venu).

CREATE OR REPLACE FUNCTION fichier_clients(p_restaurant_id uuid)
RETURNS TABLE (
  email text,
  prenom text,
  nom text,
  telephone text,
  nb_visites bigint,
  nb_a_venir bigint,
  nb_no_show bigint,
  nb_annulations bigint,
  total_couverts bigint,
  premiere_date date,
  derniere_date date
) AS $$
  SELECT
    r.email,
    -- Nom/prénom/téléphone les plus récents (un client peut avoir varié la casse
    -- ou mis à jour son numéro d'une résa à l'autre)
    (array_agg(r.prenom ORDER BY r.created_at DESC))[1],
    (array_agg(r.nom ORDER BY r.created_at DESC))[1],
    (array_agg(r.telephone ORDER BY r.created_at DESC))[1],
    count(*) FILTER (WHERE r.statut = 'confirmée' AND r.date <= CURRENT_DATE) AS nb_visites,
    count(*) FILTER (WHERE r.statut = 'confirmée' AND r.date > CURRENT_DATE) AS nb_a_venir,
    count(*) FILTER (WHERE r.statut = 'no_show') AS nb_no_show,
    count(*) FILTER (WHERE r.statut = 'annulée') AS nb_annulations,
    COALESCE(sum(r.nb_personnes) FILTER (WHERE r.statut = 'confirmée' AND r.date <= CURRENT_DATE), 0) AS total_couverts,
    min(r.date) AS premiere_date,
    max(r.date) FILTER (WHERE r.statut = 'confirmée' AND r.date <= CURRENT_DATE) AS derniere_date
  FROM reservations r
  WHERE r.restaurant_id = p_restaurant_id
    AND r.email IS NOT NULL
    AND a_acces_restaurant(p_restaurant_id)
  GROUP BY r.email
  ORDER BY derniere_date DESC NULLS LAST;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION fichier_clients(uuid) TO authenticated;
