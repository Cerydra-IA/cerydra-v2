import { supabase } from './supabase'

/**
 * Restaurant du compte connecté — propriétaire OU membre invité.
 *
 * Un membre (voir restaurant_members) ne possède aucune ligne dans
 * `restaurants`, donc un simple `.eq('user_id', user.id)` ne le trouve
 * jamais. mon_restaurant_id() (SQL) résout les deux cas.
 */
export async function monRestaurantId() {
  const { data, error } = await supabase.rpc('mon_restaurant_id')
  if (error || !data) return null
  return data
}
