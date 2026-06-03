import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Navbar from '../components/dashboard/Navbar'
import SectionCard from '../components/dashboard/SectionCard'

const STATUTS = {
  en_attente: { label: 'En attente', bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400' },
  confirmée:  { label: 'Confirmée',  bg: 'bg-green-50',  text: 'text-green-600',  dot: 'bg-green-400' },
  annulée:    { label: 'Annulée',    bg: 'bg-red-50',    text: 'text-red-500',    dot: 'bg-red-400' },
}

function Badge({ statut }) {
  const s = STATUTS[statut] || STATUTS.en_attente
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function Reservations() {
  const { user } = useAuth()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtre, setFiltre] = useState('toutes') // toutes | a_venir | passees
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    if (!user) return
    fetchReservations()
  }, [user])

  const fetchReservations = async () => {
    setLoading(true)
    setError('')

    // 1. Récupère le restaurant de l'utilisateur
    const { data: resto, error: restoErr } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (restoErr || !resto) {
      setError('Configurez d\'abord votre restaurant pour voir les réservations.')
      setLoading(false)
      return
    }

    // 2. Récupère les réservations
    const { data, error: resaErr } = await supabase
      .from('reservations')
      .select('*')
      .eq('restaurant_id', resto.id)
      .order('date', { ascending: false })
      .order('heure', { ascending: false })

    if (resaErr) {
      console.error(resaErr)
      setError('Erreur lors du chargement : ' + resaErr.message)
    } else {
      setReservations(data || [])
    }
    setLoading(false)
  }

  const updateStatut = async (id, statut) => {
    setUpdatingId(id)
    const { error } = await supabase
      .from('reservations')
      .update({ statut })
      .eq('id', id)
    if (!error) {
      setReservations((r) => r.map((res) => res.id === id ? { ...res, statut } : res))
    }
    setUpdatingId(null)
  }

  const deleteReservation = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) return
    const { error } = await supabase.from('reservations').delete().eq('id', id)
    if (!error) {
      setReservations((r) => r.filter((res) => res.id !== id))
    }
  }

  const aujourd_hui = new Date().toISOString().split('T')[0]

  const filtered = reservations.filter((r) => {
    if (filtre === 'a_venir') return r.date >= aujourd_hui
    if (filtre === 'passees') return r.date < aujourd_hui
    return true
  })

  const counts = {
    toutes: reservations.length,
    a_venir: reservations.filter((r) => r.date >= aujourd_hui).length,
    passees: reservations.filter((r) => r.date < aujourd_hui).length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold text-[#1a1a2e]">Réservations</h1>
          <button
            onClick={fetchReservations}
            className="text-xs text-gray-400 hover:text-[#1a1a2e] flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'toutes', label: 'Toutes' },
            { key: 'a_venir', label: 'À venir' },
            { key: 'passees', label: 'Passées' },
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
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-7 h-7 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm px-5 py-4 rounded-2xl">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-400 text-sm">Aucune réservation{filtre !== 'toutes' ? ' dans cette catégorie' : ''}.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Header tableau */}
            <div className="grid px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400"
              style={{ gridTemplateColumns: '1fr 1fr 80px 100px 120px 100px' }}>
              <span>Client</span>
              <span>Contact</span>
              <span>Couverts</span>
              <span>Date</span>
              <span>Heure</span>
              <span>Statut</span>
            </div>

            {/* Lignes */}
            {filtered.map((r, i) => (
              <div
                key={r.id}
                className={`grid px-5 py-4 items-center gap-2 text-sm ${
                  i < filtered.length - 1 ? 'border-b border-gray-50' : ''
                } hover:bg-gray-50/50 transition-colors`}
                style={{ gridTemplateColumns: '1fr 1fr 80px 100px 120px 100px' }}
              >
                {/* Client */}
                <div>
                  <p className="font-medium text-[#1a1a2e]">{r.prenom} {r.nom}</p>
                  {r.message && (
                    <p className="text-xs text-gray-400 truncate max-w-[180px]" title={r.message}>
                      💬 {r.message}
                    </p>
                  )}
                </div>

                {/* Contact */}
                <div className="space-y-0.5">
                  <p className="text-gray-500 text-xs">{r.email}</p>
                  <p className="text-gray-400 text-xs">{r.telephone}</p>
                </div>

                {/* Couverts */}
                <span className="text-gray-600">{r.nb_personnes} pers.</span>

                {/* Date */}
                <span className="text-gray-600 text-xs">{formatDate(r.date)}</span>

                {/* Heure */}
                <span className="font-medium text-[#1a1a2e]">{r.heure?.slice(0, 5)}</span>

                {/* Statut + actions */}
                <div className="flex flex-col gap-1">
                  <Badge statut={r.statut} />
                  {r.statut === 'en_attente' && (
                    <div className="flex gap-1 mt-0.5">
                      <button
                        onClick={() => updateStatut(r.id, 'confirmée')}
                        disabled={updatingId === r.id}
                        className="text-xs text-green-600 hover:underline disabled:opacity-40"
                      >
                        Confirmer
                      </button>
                      <span className="text-gray-300">·</span>
                      <button
                        onClick={() => updateStatut(r.id, 'annulée')}
                        disabled={updatingId === r.id}
                        className="text-xs text-red-400 hover:underline disabled:opacity-40"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                  {r.statut === 'confirmée' && (
                    <button
                      onClick={() => updateStatut(r.id, 'annulée')}
                      disabled={updatingId === r.id}
                      className="text-xs text-red-400 hover:underline disabled:opacity-40 mt-0.5"
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    onClick={() => deleteReservation(r.id)}
                    className="text-xs text-gray-300 hover:text-red-500 transition-colors mt-0.5"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
