import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { monRestaurantId } from '../lib/restaurant'
import Navbar from '../components/dashboard/Navbar'

// Au-delà de ce nombre de jours sans visite, un client fidèle devient une
// cible de relance plutôt qu'un simple habitué — seuil arbitraire mais
// raisonnable pour un restaurant (un trimestre sans revenir).
const SEUIL_RELANCE_JOURS = 90

function joursDepuis(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000)
}

function segmentClient(c) {
  if (c.nb_visites === 0) return 'sans_venue'
  const jours = joursDepuis(c.derniere_date)
  if (jours !== null && jours > SEUIL_RELANCE_JOURS) return 'a_relancer'
  if (c.nb_visites >= 3) return 'fidele'
  return 'actif'
}

const SEGMENTS = {
  a_relancer: { label: 'À relancer', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  fidele:     { label: 'Fidèle',     bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-400' },
  actif:      { label: 'Actif',      bg: 'bg-blue-50',  text: 'text-blue-600',  dot: 'bg-blue-400' },
  sans_venue: { label: 'Sans venue', bg: 'bg-gray-100',  text: 'text-gray-500',  dot: 'bg-gray-400' },
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Badge({ segment }) {
  const s = SEGMENTS[segment]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export default function Clients() {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtre, setFiltre] = useState('tous')
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    if (!user) return
    fetchClients()
  }, [user])

  const fetchClients = async () => {
    setLoading(true)
    setError('')
    const restoId = await monRestaurantId()
    if (!restoId) {
      setError('Configurez d\'abord votre restaurant pour voir votre fichier client.')
      setLoading(false)
      return
    }
    const { data, error: err } = await supabase.rpc('fichier_clients', { p_restaurant_id: restoId })
    if (err) {
      console.error(err)
      setError('Erreur lors du chargement : ' + err.message)
    } else {
      setClients(data || [])
    }
    setLoading(false)
  }

  const enrichis = useMemo(
    () => clients.map((c) => ({ ...c, segment: segmentClient(c) })),
    [clients]
  )

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return enrichis.filter((c) => {
      if (filtre !== 'tous' && c.segment !== filtre) return false
      if (q && !`${c.prenom} ${c.nom} ${c.email}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [enrichis, filtre, recherche])

  const counts = useMemo(() => {
    const c = { tous: enrichis.length, a_relancer: 0, fidele: 0, actif: 0, sans_venue: 0 }
    for (const cl of enrichis) c[cl.segment]++
    return c
  }, [enrichis])

  const exportCSV = () => {
    const cols = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Visites', 'Couverts cumulés', 'Dernière visite', 'Segment']
    const rows = filtres.map((c) => [
      c.prenom, c.nom, c.email, c.telephone || '', c.nb_visites, c.total_couverts,
      c.derniere_date || '', SEGMENTS[c.segment].label,
    ])
    const csv = [cols, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-[#1a1a2e]">Clients</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              disabled={filtres.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:border-[#1a1a2e] hover:text-[#1a1a2e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exporter CSV
            </button>
            <button
              onClick={fetchClients}
              className="text-xs text-gray-400 hover:text-[#1a1a2e] flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualiser
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-6">
          Regroupé par email — un client qui revient compte pour une seule ligne, pas une par réservation.
        </p>

        {/* Filtres + recherche */}
        <div className="flex gap-2 mb-6 flex-wrap items-center">
          {[
            { key: 'tous', label: 'Tous' },
            { key: 'a_relancer', label: 'À relancer' },
            { key: 'fidele', label: 'Fidèles' },
            { key: 'actif', label: 'Actifs' },
            { key: 'sans_venue', label: 'Sans venue' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFiltre(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filtre === key
                  ? 'bg-[#1a1a2e] text-white'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {label}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                filtre === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {counts[key]}
              </span>
            </button>
          ))}
          <input
            type="text"
            placeholder="Rechercher un nom, un email…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="ml-auto px-3.5 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#1a1a2e] transition-colors w-full sm:w-64"
          />
        </div>

        {/* Encart pédagogique pour le segment "à relancer" */}
        {filtre === 'a_relancer' && counts.a_relancer > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <p className="text-sm text-amber-800">
              Ces clients sont déjà venus au moins une fois, mais pas depuis plus de {SEUIL_RELANCE_JOURS} jours.
              Une relance simple (email, SMS, message) suffit souvent à les faire revenir.
            </p>
          </div>
        )}

        {/* Contenu */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-7 h-7 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm px-5 py-4 rounded-2xl">
            {error}
          </div>
        ) : filtres.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-gray-400 text-sm">
              {clients.length === 0 ? 'Aucun client pour l\'instant.' : 'Aucun client dans cette catégorie.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile : cartes */}
            <div className="flex flex-col gap-3 md:hidden">
              {filtres.map((c) => (
                <div key={c.email} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#1a1a2e] text-sm">{c.prenom} {c.nom}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                      {c.telephone && <p className="text-xs text-gray-400">{c.telephone}</p>}
                    </div>
                    <Badge segment={c.segment} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 pt-1 border-t border-gray-50">
                    <span>{c.nb_visites} visite{c.nb_visites > 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{c.total_couverts} couverts</span>
                    <span>·</span>
                    <span>Dernière : {formatDate(c.derniere_date)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop : tableau */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="grid px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400"
                style={{ gridTemplateColumns: '1.3fr 1fr 90px 110px 130px 120px' }}>
                <span>Client</span>
                <span>Contact</span>
                <span>Visites</span>
                <span>Couverts</span>
                <span>Dernière visite</span>
                <span>Segment</span>
              </div>
              {filtres.map((c, i) => (
                <div
                  key={c.email}
                  className={`grid px-5 py-4 items-center gap-2 text-sm ${
                    i < filtres.length - 1 ? 'border-b border-gray-50' : ''
                  } hover:bg-gray-50/50 transition-colors`}
                  style={{ gridTemplateColumns: '1.3fr 1fr 90px 110px 130px 120px' }}
                >
                  <p className="font-medium text-[#1a1a2e]">{c.prenom} {c.nom}</p>
                  <div className="space-y-0.5">
                    <p className="text-gray-500 text-xs">{c.email}</p>
                    <p className="text-gray-400 text-xs">{c.telephone}</p>
                  </div>
                  <span className="text-gray-600">{c.nb_visites}</span>
                  <span className="text-gray-600">{c.total_couverts}</span>
                  <span className="text-gray-600 text-xs">{formatDate(c.derniere_date)}</span>
                  <Badge segment={c.segment} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
