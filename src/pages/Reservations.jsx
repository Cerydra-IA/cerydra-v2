import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { monRestaurantId } from '../lib/restaurant'
import Navbar from '../components/dashboard/Navbar'
import SectionCard from '../components/dashboard/SectionCard'
import { usePushNotifications } from '../hooks/usePushNotifications'

const STATUTS = {
  en_attente: { label: 'En attente', bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400' },
  confirmée:  { label: 'Confirmée',  bg: 'bg-green-50',  text: 'text-green-600',  dot: 'bg-green-400' },
  annulée:    { label: 'Annulée',    bg: 'bg-red-50',    text: 'text-red-500',    dot: 'bg-red-400' },
  no_show:    { label: 'No-show',    bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400' },
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

const EMPTY_FORM = {
  prenom: '', nom: '', telephone: '', email: '',
  date: '', heure: '', nb_personnes: 2, message: '',
}

// Modal de réservation manuelle (client au téléphone / sur place)
function NouvelleResaModal({ restoId, initial, onClose, onCreated }) {
  const [form, setForm] = useState(() => initial ? { ...EMPTY_FORM, ...initial } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dispo, setDispo] = useState(null)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // Disponibilité du créneau : on n'empêche rien (le restaurateur décide),
  // on l'informe pour éviter de vendre deux fois la même table.
  useEffect(() => {
    if (!restoId || !form.date || !form.heure) { setDispo(null); return }
    let annule = false
    supabase
      .rpc('creneau_disponibilite', {
        p_restaurant_id: restoId,
        p_date: form.date,
        p_heure: form.heure.length === 5 ? `${form.heure}:00` : form.heure,
        p_personnes: Number(form.nb_personnes) || 2,
      })
      .then(({ data, error: err }) => {
        if (!annule && !err && data && !data.erreur) setDispo(data)
      })
    return () => { annule = true }
  }, [restoId, form.date, form.heure, form.nb_personnes])
  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#1a1a2e] transition-colors'

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.prenom || !form.nom || !form.date || !form.heure) {
      setError('Prénom, nom, date et heure sont obligatoires.')
      return
    }
    setSaving(true)
    const { error: err } = await supabase.from('reservations').insert({
      restaurant_id: restoId,
      prenom: form.prenom,
      nom: form.nom,
      telephone: form.telephone || null,
      email: form.email || null,
      date: form.date,
      heure: form.heure,
      nb_personnes: Number(form.nb_personnes),
      message: form.message || null,
      statut: 'confirmée',
    })
    setSaving(false)
    if (err) {
      const msg = err.message || ''
      if (msg.includes('date_invalide')) setError('Date invalide (passée ou trop lointaine).')
      else if (msg.includes('nb_personnes_invalide')) setError('Nombre de personnes invalide.')
      else if (msg.includes('email_invalide')) setError('Email invalide.')
      else setError('Erreur : ' + msg)
      return
    }
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[#1a1a2e]">Nouvelle réservation</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} placeholder="Prénom *" value={form.prenom} onChange={set('prenom')} />
            <input className={inputCls} placeholder="Nom *" value={form.nom} onChange={set('nom')} />
          </div>
          <input className={inputCls} placeholder="Téléphone" value={form.telephone} onChange={set('telephone')} />
          <input className={inputCls} type="email" placeholder="Email (facultatif — pour la confirmation et le rappel)" value={form.email} onChange={set('email')} />
          <div className="grid grid-cols-3 gap-3">
            <input className={`${inputCls} col-span-1`} type="date" value={form.date} onChange={set('date')} />
            <input className={`${inputCls} col-span-1`} type="time" value={form.heure} onChange={set('heure')} />
            <select className={`${inputCls} col-span-1`} value={form.nb_personnes} onChange={set('nb_personnes')}>
              {Array.from({ length: 20 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1} pers.</option>
              ))}
            </select>
          </div>
          <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Note (allergies, table préférée…)" value={form.message} onChange={set('message')} />

          {/* Occupation du créneau — informatif, jamais bloquant */}
          {dispo && dispo.tables_total > 0 && (
            <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs ${
              dispo.complet
                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                : 'bg-gray-50 text-gray-500'
            }`}>
              <span>{dispo.complet ? '⚠️' : '🪑'}</span>
              <span>
                {dispo.complet ? (
                  <>
                    <b>Aucune table disponible pour {form.nb_personnes} personne{form.nb_personnes > 1 ? 's' : ''}</b>{' '}
                    sur ce créneau ({dispo.tables_occupees}/{dispo.tables_total} tables occupées).
                    Vous pouvez tout de même enregistrer cette réservation.
                  </>
                ) : (
                  <>
                    {dispo.restant} table{dispo.restant > 1 ? 's' : ''} encore disponible
                    {dispo.restant > 1 ? 's' : ''} sur ce créneau ({dispo.tables_occupees}/{dispo.tables_total} occupées).
                  </>
                )}
              </span>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[#1a1a2e] text-white rounded-xl text-sm font-semibold hover:bg-[#2a2a4e] transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer la réservation'}
          </button>
          <p className="text-[11px] text-gray-400 text-center">
            Créée en statut « Confirmée ». Si un email est renseigné, le client reçoit la confirmation et le rappel automatiques.
          </p>
        </form>
      </div>
    </div>
  )
}

// Liste d'attente : clients laissés sur le carreau par une journée complète.
// Le restaurateur les rappelle en cas de désistement — pas de placement
// automatique, la disponibilité change trop vite pour ça.
function WaitlistSection({ entries, loading, updatingId, onCreerResa, onAnnuler }) {
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <div className="text-4xl mb-3">⏳</div>
        <p className="text-gray-400 text-sm">Personne en liste d'attente pour l'instant.</p>
        <p className="text-gray-300 text-xs mt-1">Elle se remplit quand un client réserve un jour complet.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {entries.map((a) => (
        <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="font-semibold text-[#1a1a2e] text-sm">{a.prenom} {a.nom}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDate(a.date)}{a.heure ? ` · vers ${a.heure.slice(0, 5)}` : ''} · {a.nb_personnes} pers.
            </p>
            <p className="text-xs text-gray-400">{a.email}{a.telephone ? ` · ${a.telephone}` : ''}</p>
            {a.message && <p className="text-xs text-gray-400 italic mt-0.5">💬 {a.message}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => onCreerResa(a)}
              disabled={updatingId === a.id}
              className="px-3 py-2 rounded-xl bg-green-50 text-green-600 text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-40"
            >
              Une table s'est libérée
            </button>
            <button
              onClick={() => onAnnuler(a.id)}
              disabled={updatingId === a.id}
              className="px-3 py-2 rounded-xl bg-gray-50 text-gray-400 text-xs font-medium hover:bg-gray-100 hover:text-red-500 transition-colors disabled:opacity-40"
            >
              Retirer
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Reservations() {
  const { user } = useAuth()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtre, setFiltre] = useState('toutes')
  const [dateRecherche, setDateRecherche] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [restoId, setRestoId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [prefillResa, setPrefillResa] = useState(null)

  // Liste d'attente : vue séparée, chargée seulement quand on y va (données
  // distinctes des réservations, pas la peine de les récupérer par défaut).
  const [vue, setVue] = useState('reservations')
  const [attente, setAttente] = useState([])
  const [attenteLoading, setAttenteLoading] = useState(false)
  const [attenteUpdatingId, setAttenteUpdatingId] = useState(null)

  usePushNotifications(user, restoId)

  const exportCSV = () => {
    const cols = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Date', 'Heure', 'Couverts', 'Statut']
    const rows = reservations.map((r) => [
      r.prenom, r.nom, r.email, r.telephone || '',
      r.date, r.heure?.slice(0, 5), r.nb_personnes, r.statut,
    ])
    const csv = [cols, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reservations-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!user) return
    fetchReservations()
  }, [user])

  const fetchReservations = async () => {
    setLoading(true)
    setError('')

    // 1. Récupère le restaurant du compte connecté (propriétaire ou membre)
    const restoId0 = await monRestaurantId()
    if (!restoId0) {
      setError('Configurez d\'abord votre restaurant pour voir les réservations.')
      setLoading(false)
      return
    }
    const resto = { id: restoId0 }
    setRestoId(resto.id)

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

  // window.confirm est bloqué dans les PWA iOS installées → confirmation en 2 taps
  const deleteReservation = async (id) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      setTimeout(() => setConfirmDeleteId((cur) => (cur === id ? null : cur)), 3000)
      return
    }
    setConfirmDeleteId(null)
    const { error } = await supabase.from('reservations').delete().eq('id', id)
    if (!error) {
      setReservations((r) => r.filter((res) => res.id !== id))
    }
  }

  const fetchAttente = async () => {
    if (!restoId) return
    setAttenteLoading(true)
    const { data, error: err } = await supabase
      .from('liste_attente')
      .select('*')
      .eq('restaurant_id', restoId)
      .eq('statut', 'en_attente')
      .order('date')
      .order('created_at')
    if (!err) setAttente(data || [])
    setAttenteLoading(false)
  }

  useEffect(() => {
    if (vue === 'attente' && restoId) fetchAttente()
  }, [vue, restoId])

  const updateAttenteStatut = async (id, statut) => {
    setAttenteUpdatingId(id)
    const { error } = await supabase.from('liste_attente').update({ statut }).eq('id', id)
    if (!error) setAttente((prev) => prev.filter((a) => a.id !== id))
    setAttenteUpdatingId(null)
  }

  // Depuis une entrée d'attente, ouvre directement le formulaire de résa
  // manuelle prérempli : évite de ressaisir nom/contact/couverts.
  const creerResaDepuisAttente = (a) => {
    setPrefillResa({
      prenom: a.prenom, nom: a.nom, telephone: a.telephone || '', email: a.email || '',
      date: a.date, heure: a.heure ? a.heure.slice(0, 5) : '', nb_personnes: a.nb_personnes,
      message: a.message || '',
      _attenteId: a.id,
    })
    setShowNewModal(true)
  }

  const aujourd_hui = new Date().toISOString().split('T')[0]

  const filtered = reservations
    .filter((r) => {
      // Une date précise prime sur l'onglet : on cherche un jour, pas une
      // catégorie, quand le champ est rempli.
      if (dateRecherche) return r.date === dateRecherche
      if (filtre === 'aujourd_hui') return r.date === aujourd_hui
      if (filtre === 'a_venir') return r.date >= aujourd_hui
      if (filtre === 'passees') return r.date < aujourd_hui
      return true
    })
    // Vue "aujourd'hui"/"à venir"/date précise : la prochaine arrivée en
    // premier, comme une fiche de service. Vue "passées" : la plus récente
    // en premier (par défaut du tri serveur), pour retrouver rapidement ce
    // qui vient de se passer.
    .sort((a, b) => {
      if (!dateRecherche && filtre === 'passees') return 0
      return a.date.localeCompare(b.date) || (a.heure || '').localeCompare(b.heure || '')
    })

  const counts = {
    toutes: reservations.length,
    aujourd_hui: reservations.filter((r) => r.date === aujourd_hui).length,
    a_venir: reservations.filter((r) => r.date >= aujourd_hui).length,
    passees: reservations.filter((r) => r.date < aujourd_hui).length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {showNewModal && (
        <NouvelleResaModal
          restoId={restoId}
          initial={prefillResa}
          onClose={() => { setShowNewModal(false); setPrefillResa(null) }}
          onCreated={() => {
            fetchReservations()
            if (prefillResa?._attenteId) updateAttenteStatut(prefillResa._attenteId, 'placee')
            setPrefillResa(null)
          }}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-[#1a1a2e]">Réservations</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewModal(true)}
              disabled={!restoId}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1a1a2e] text-white text-xs font-medium hover:bg-[#2a2a4e] transition-colors disabled:opacity-40"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle réservation
            </button>
            <button
              onClick={exportCSV}
              disabled={reservations.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:border-[#1a1a2e] hover:text-[#1a1a2e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exporter CSV
            </button>
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
        </div>

        {/* Vue : réservations confirmées vs liste d'attente (données distinctes) */}
        <div className="flex gap-1 mb-5 bg-white border border-gray-100 rounded-2xl p-1 w-fit">
          {[['reservations', 'Réservations'], ['attente', "Liste d'attente"]].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setVue(v)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
                vue === v ? 'bg-[#1a1a2e] text-white' : 'text-gray-500 hover:text-[#1a1a2e]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {vue === 'attente' ? (
          <WaitlistSection
            entries={attente}
            loading={attenteLoading}
            updatingId={attenteUpdatingId}
            onCreerResa={creerResaDepuisAttente}
            onAnnuler={(id) => updateAttenteStatut(id, 'annulee')}
          />
        ) : (
        <>
        {/* Filtres */}
        <div className="flex gap-2 mb-3 flex-wrap items-center">
          {[
            { key: 'toutes', label: 'Toutes' },
            { key: 'aujourd_hui', label: "Aujourd'hui" },
            { key: 'a_venir', label: 'À venir' },
            { key: 'passees', label: 'Passées' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setFiltre(key); setDateRecherche('') }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filtre === key && !dateRecherche
                  ? 'bg-[#1a1a2e] text-white'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {label}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                filtre === key && !dateRecherche ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {counts[key]}
              </span>
            </button>
          ))}

          {/* Rechercher un jour précis : passe devant les onglets ci-dessus */}
          <div className="flex items-center gap-1.5 ml-1">
            <input
              type="date"
              value={dateRecherche}
              onChange={(e) => setDateRecherche(e.target.value)}
              className={`px-3 py-2 rounded-xl text-sm border transition-colors ${
                dateRecherche
                  ? 'border-[#1a1a2e] text-[#1a1a2e] bg-white'
                  : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
              }`}
            />
            {dateRecherche && (
              <button
                onClick={() => setDateRecherche('')}
                title="Effacer la recherche"
                className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          {dateRecherche
            ? `${filtered.length} réservation${filtered.length > 1 ? 's' : ''} le ${formatDate(dateRecherche)}`
            : ' '}
        </p>

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
          <>
            {/* ── MOBILE : cartes ─────────────────────────────────── */}
            <div className="flex flex-col gap-3 md:hidden">
              {filtered.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                  {/* Ligne 1 : nom + badge statut */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#1a1a2e] text-sm">{r.prenom} {r.nom}</p>
                      {r.message && (
                        <p className="text-xs text-gray-400 mt-0.5">💬 {r.message}</p>
                      )}
                    </div>
                    <Badge statut={r.statut} />
                  </div>

                  {/* Ligne 2 : date + heure + couverts */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(r.date)}
                    </span>
                    <span className="font-semibold text-[#1a1a2e]">{r.heure?.slice(0, 5)}</span>
                    <span>{r.nb_personnes} pers.</span>
                  </div>

                  {/* Ligne 3 : contact */}
                  <div className="text-xs text-gray-400 space-y-0.5">
                    <p>{r.email}</p>
                    {r.telephone && <p>{r.telephone}</p>}
                  </div>

                  {/* Ligne 4 : actions */}
                  <div className="flex gap-2 pt-1 border-t border-gray-50">
                    {r.statut === 'en_attente' && (
                      <>
                        <button
                          onClick={() => updateStatut(r.id, 'confirmée')}
                          disabled={updatingId === r.id}
                          className="flex-1 py-2 rounded-xl bg-green-50 text-green-600 text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-40"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => updateStatut(r.id, 'annulée')}
                          disabled={updatingId === r.id}
                          className="flex-1 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-40"
                        >
                          Annuler
                        </button>
                      </>
                    )}
                    {r.statut === 'confirmée' && (
                      <>
                        <button
                          onClick={() => updateStatut(r.id, 'annulée')}
                          disabled={updatingId === r.id}
                          className="flex-1 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-40"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => updateStatut(r.id, 'no_show')}
                          disabled={updatingId === r.id}
                          title="Le client n'est jamais venu, sans prévenir"
                          className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-medium hover:bg-gray-200 transition-colors disabled:opacity-40"
                        >
                          No-show
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => deleteReservation(r.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        confirmDeleteId === r.id
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-red-500'
                      }`}
                    >
                      {confirmDeleteId === r.id ? 'Confirmer ?' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── DESKTOP : tableau ───────────────────────────────── */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
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
                  <div>
                    <p className="font-medium text-[#1a1a2e]">{r.prenom} {r.nom}</p>
                    {r.message && (
                      <p className="text-xs text-gray-400 truncate max-w-[180px]" title={r.message}>
                        💬 {r.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-gray-500 text-xs">{r.email}</p>
                    <p className="text-gray-400 text-xs">{r.telephone}</p>
                  </div>
                  <span className="text-gray-600">{r.nb_personnes} pers.</span>
                  <span className="text-gray-600 text-xs">{formatDate(r.date)}</span>
                  <span className="font-medium text-[#1a1a2e]">{r.heure?.slice(0, 5)}</span>
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
                      <div className="flex gap-1 mt-0.5">
                        <button
                          onClick={() => updateStatut(r.id, 'annulée')}
                          disabled={updatingId === r.id}
                          className="text-xs text-red-400 hover:underline disabled:opacity-40"
                        >
                          Annuler
                        </button>
                        <span className="text-gray-300">·</span>
                        <button
                          onClick={() => updateStatut(r.id, 'no_show')}
                          disabled={updatingId === r.id}
                          title="Le client n'est jamais venu, sans prévenir"
                          className="text-xs text-gray-400 hover:underline disabled:opacity-40"
                        >
                          No-show
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => deleteReservation(r.id)}
                      className={`text-xs transition-colors mt-0.5 underline-offset-2 hover:underline ${
                        confirmDeleteId === r.id
                          ? 'text-red-500 font-semibold'
                          : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      {confirmDeleteId === r.id ? 'Confirmer ?' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        </>
        )}
      </div>
    </div>
  )
}
