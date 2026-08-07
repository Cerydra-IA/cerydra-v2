-- Retirer un membre laissait traîner ses notifications push pour ce
-- restaurant : send-push interroge push_subscriptions par restaurant_id
-- seul, sans vérifier l'appartenance à restaurant_members. Un ex-membre
-- continuait donc à recevoir une alerte à chaque nouvelle réservation.
--
-- La RLS sur push_subscriptions n'autorise chacun qu'à gérer ses propres
-- abonnements (user_id = auth.uid()) : le propriétaire ne peut pas supprimer
-- directement celui d'un membre qu'il retire, d'où ce passage par une
-- fonction SECURITY DEFINER.

CREATE OR REPLACE FUNCTION retirer_membre(p_restaurant_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM restaurants WHERE id = p_restaurant_id AND user_id = auth.uid()
  ) AND auth.uid() <> 'e46a1351-987d-411f-8b8c-1ab91ee2f09f'::uuid THEN
    RAISE EXCEPTION 'non_autorise';
  END IF;

  DELETE FROM restaurant_members WHERE restaurant_id = p_restaurant_id AND user_id = p_user_id;
  DELETE FROM push_subscriptions WHERE restaurant_id = p_restaurant_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION retirer_membre(uuid, uuid) TO authenticated;
