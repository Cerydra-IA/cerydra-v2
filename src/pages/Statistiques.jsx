import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Navbar from '../components/dashboard/Navbar'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

function addDays(base, n) {
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function fmtDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function fmtMonth(key) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-6 py-5">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-semibold text-[#1a1a2e]">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function CustomTooltip({ active, payload, label, unite = 'réservation' }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-[#1a1a2e]">{v} {unite}{v !== 1 ? 's' : ''}</p>
    </div>
  )
}

export default function Statistiques() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalMois: 0, couvertsMois: 0, tauxAnnulation: 0, noShowsMois: 0, tauxNoShow: 0 })
  const [dailyData, setDailyData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [monthlyNoShow, setMonthlyNoShow] = useState([])

  useEffect(() => {
    if (!user) return
    fetchStats()
  }, [user])

  async function fetchStats() {
    setLoading(true)

    const { data: resto } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!resto) { setLoading(false); return }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const day30ago   = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const month6ago  = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]

    const [{ data: resMois }, { data: res30j }, { data: res6m }] = await Promise.all([
      supabase.from('reservations').select('statut, nb_personnes').eq('restaurant_id', resto.id).gte('date', monthStart),
      supabase.from('reservations').select('date').eq('restaurant_id', resto.id).neq('statut', 'annulée').gte('date', day30ago),
      supabase.from('reservations').select('date, statut').eq('restaurant_id', resto.id).neq('statut', 'annulée').gte('date', month6ago),
    ])

    const total      = (resMois ?? []).length
    const annulees   = (resMois ?? []).filter(r => r.statut === 'annulée').length
    const noShows    = (resMois ?? []).filter(r => r.statut === 'no_show').length
    // Couverts réels : ni annulé (jamais confirmé), ni no-show (personne à table)
    const couverts   = (resMois ?? []).filter(r => r.statut !== 'annulée' && r.statut !== 'no_show')
      .reduce((s, r) => s + (r.nb_personnes || 0), 0)
    // Le taux de no-show se calcule sur les réservations honorées ou non
    // (annulées à l'avance exclues : prévenir n'est pas un no-show)
    const honorables = total - annulees
    setStats({
      totalMois: total - annulees,
      couvertsMois: couverts,
      tauxAnnulation: total > 0 ? Math.round(annulees / total * 100) : 0,
      noShowsMois: noShows,
      tauxNoShow: honorables > 0 ? Math.round(noShows / honorables * 100) : 0,
    })

    // Daily 30j
    const byDay = {}
    for (let i = 0; i < 30; i++) byDay[addDays(day30ago, i)] = 0
    for (const r of res30j ?? []) if (byDay[r.date] !== undefined) byDay[r.date]++
    setDailyData(Object.entries(byDay).map(([date, count]) => ({ date: fmtDay(date), reservations: count })))

    // Monthly 6m
    const byMonth = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      byMonth[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`] = 0
    }
    for (const r of res6m ?? []) { const k = r.date.slice(0,7); if (byMonth[k] !== undefined) byMonth[k]++ }
    setMonthlyData(Object.entries(byMonth).map(([key, count]) => ({ mois: fmtMonth(key), reservations: count })))

    // No-shows par mois — 6m : compte séparé, la courbe reste visible même
    // quand un seul no-show est noyé dans le volume total des réservations.
    const byMonthNoShow = {}
    for (const key of Object.keys(byMonth)) byMonthNoShow[key] = 0
    for (const r of res6m ?? []) {
      if (r.statut !== 'no_show') continue
      const k = r.date.slice(0, 7)
      if (byMonthNoShow[k] !== undefined) byMonthNoShow[k]++
    }
    setMonthlyNoShow(Object.entries(byMonthNoShow).map(([key, count]) => ({ mois: fmtMonth(key), noShows: count })))

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <h1 className="text-xl font-bold text-[#1a1a2e]">Statistiques</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-7 h-7 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <StatCard label="Réservations ce mois" value={stats.totalMois} sub="hors annulées" />
              <StatCard label="Couverts ce mois" value={stats.couvertsMois} sub="hors annulées et no-shows" />
              <StatCard label="Taux d'annulation" value={stats.tauxAnnulation + '%'} sub="sur ce mois" />
              <StatCard
                label="No-shows ce mois"
                value={stats.noShowsMois}
                sub={`${stats.tauxNoShow}% des résas honorables — un taux se lit mal à faible volume`}
              />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-[#1a1a2e] mb-6">Réservations par jour — 30 derniers jours</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={4} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="reservations" stroke="#1a1a2e" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#1a1a2e' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-[#1a1a2e] mb-6">Réservations par mois — 6 derniers mois</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="reservations" fill="#1a1a2e" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-[#1a1a2e] mb-1">No-shows par mois — 6 derniers mois</h2>
              <p className="text-xs text-gray-400 mb-6">Clients réservés jamais venus, sans annuler</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyNoShow} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip unite="no-show" />} />
                  <Bar dataKey="noShows" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
