import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Navigate } from 'react-router-dom'

const ADMIN_EMAIL = 'contact@cerydra.fr'

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-6 py-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-semibold text-[#1a1a2e]">{value ?? '—'}</p>
    </div>
  )
}

export default function Admin() {
  const { user, loading } = useAuth()
  const [stats, setStats] = useState({ total: 0, active: 0, reservationsMonth: 0 })
  const [restaurants, setRestaurants] = useState([])
  const [recent, setRecent] = useState([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return
    fetchData()
  }, [user])

  async function fetchData() {
    setFetching(true)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [{ data: restos }, { data: allReservations }, { data: recentRes }, { data: allResTotal }] =
      await Promise.all([
        supabase.from('restaurants').select('id, name, slug, created_at, user_id'),
        supabase.from('reservations').select('id, restaurant_id, created_at').gte('created_at', monthStart),
        supabase
          .from('reservations')
          .select('id, prenom, nom, nb_personnes, date, created_at, restaurant_id')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('reservations').select('id, restaurant_id'),
      ])

    const reservationCountById = {}
    const activeIds = new Set()
    for (const r of allReservations ?? []) {
      reservationCountById[r.restaurant_id] = (reservationCountById[r.restaurant_id] ?? 0) + 1
      activeIds.add(r.restaurant_id)
    }

    const totalCountById = {}
    for (const r of allResTotal ?? []) {
      totalCountById[r.restaurant_id] = (totalCountById[r.restaurant_id] ?? 0) + 1
    }

    // Build a name lookup map from restos to avoid a join query
    const restoNameById = {}
    for (const r of restos ?? []) restoNameById[r.id] = r.name

    const enriched = (restos ?? []).map((resto) => ({
      ...resto,
      totalReservations: totalCountById[resto.id] ?? 0,
      active: activeIds.has(resto.id),
    }))

    const recentWithName = (recentRes ?? []).map((r) => ({
      ...r,
      restaurantName: restoNameById[r.restaurant_id] ?? '—',
    }))

    setRestaurants(enriched)
    setRecent(recentWithName)
    setStats({
      total: enriched.length,
      active: activeIds.size,
      reservationsMonth: allReservations?.length ?? 0,
    })
    setFetching(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/connexion" replace />
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-[#1a1a2e] text-lg">Cerydra — Admin</span>
        <span className="text-sm text-gray-400">{user.email}</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Restaurants inscrits" value={stats.total} />
          <StatCard label="Restaurants actifs ce mois" value={stats.active} />
          <StatCard label="Réservations ce mois" value={stats.reservationsMonth} />
        </div>

        {/* Restaurants table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-[#1a1a2e]">Restaurants</h2>
          </div>
          {fetching ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="px-6 py-3 font-medium">Nom</th>
                    <th className="px-6 py-3 font-medium">Slug</th>
                    <th className="px-6 py-3 font-medium">Inscription</th>
                    <th className="px-6 py-3 font-medium">Réservations</th>
                    <th className="px-6 py-3 font-medium">Statut</th>
                    <th className="px-6 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-[#1a1a2e]">{r.name}</td>
                      <td className="px-6 py-3 text-gray-500">{r.slug}</td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(r.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-3 text-gray-700">{r.totalReservations}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            r.active
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {r.active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <a
                          href={`/resto/${r.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#2563EB] hover:underline text-xs whitespace-nowrap"
                        >
                          Voir la page →
                        </a>
                      </td>
                    </tr>
                  ))}
                  {restaurants.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm">
                        Aucun restaurant
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent reservations */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-[#1a1a2e]">Activité récente</h2>
            <p className="text-sm text-gray-400 mt-0.5">10 dernières réservations sur la plateforme</p>
          </div>
          {fetching ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="px-6 py-3 font-medium">Client</th>
                    <th className="px-6 py-3 font-medium">Restaurant</th>
                    <th className="px-6 py-3 font-medium">Date de réservation</th>
                    <th className="px-6 py-3 font-medium">Couverts</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-[#1a1a2e]">
                        {[r.prenom, r.nom].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-500">{r.restaurantName}</td>
                      <td className="px-6 py-3 text-gray-500">
                        {r.date
                          ? new Date(r.date).toLocaleDateString('fr-FR')
                          : new Date(r.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-3 text-gray-700">{r.nb_personnes ?? '—'}</td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">
                        Aucune réservation
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
