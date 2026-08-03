import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Navbar from '../components/dashboard/Navbar'
import { deriveStatus, serviceAuMoment, nombreServices, TABLE_DEFAULT_DURATION } from '../lib/planStatus'

// ─── Constantes ──────────────────────────────────────────────────────────────

const STATUS = {
  libre:    { label: 'Libre',    bg: '#22c55e', text: '#fff', ring: '#16a34a' },
  reservee: { label: 'Réservée', bg: '#f59e0b', text: '#fff', ring: '#d97706' },
  occupee:  { label: 'Occupée',  bg: '#ef4444', text: '#fff', ring: '#dc2626' },
  bloquee:  { label: 'Bloquée',  bg: '#9ca3af', text: '#fff', ring: '#6b7280' },
}

const CANVAS_H = 480

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

function formatHeure(h) { return h?.slice(0, 5) || '' }

function today() { return new Date().toISOString().split('T')[0] }

function decalerJour(dateStr, jours) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + jours)
  return d.toISOString().split('T')[0]
}

function heureCourte(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type }) {
  if (!message) return null
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium ${
      type === 'success' ? 'bg-[#1a1a2e] text-white' : 'bg-red-500 text-white'
    }`}>
      {message}
    </div>
  )
}

// ─── TableShape ───────────────────────────────────────────────────────────────

function TableShape({ table, assignment, derived, nbServices = 0, selected, onTap, onDragStart, configMode }) {
  const d = derived || { status: assignment?.status || 'libre' }
  const s = STATUS[d.status] || STATUS.libre
  const sz = table.capacity <= 2 ? 52 : table.capacity <= 4 ? 64 : 78
  // Plusieurs tournées dans la journée : on le signale d'un coup d'œil
  const plusieursServices = !configMode && nbServices > 1
  // Réservation encore lointaine : la table reste verte, l'heure est rappelée
  const showClient = d.status !== 'libre' && assignment?.client_name

  return (
    <div
      onMouseDown={configMode ? onDragStart : undefined}
      onClick={!configMode ? onTap : undefined}
      title={`${table.name} — ${table.capacity} pers.`}
      style={{
        position: 'absolute',
        left: `${table.x_pct}%`,
        top: `${table.y_pct}%`,
        transform: 'translate(-50%, -50%)',
        width: sz, height: sz,
        backgroundColor: s.bg,
        // « en retard » : hachures pour alerter sans changer la couleur
        backgroundImage: d.late
          ? 'repeating-linear-gradient(45deg, rgba(255,255,255,.35) 0 5px, transparent 5px 10px)'
          : undefined,
        border: `3px solid ${selected ? '#1a6bff' : s.ring}`,
        borderRadius: table.shape === 'round' ? '50%' : '12px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: configMode ? 'grab' : 'pointer',
        userSelect: 'none',
        boxShadow: selected ? '0 0 0 3px #1a6bff44' : '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        zIndex: selected ? 10 : 1,
      }}
    >
      <span style={{ color: s.text, fontWeight: 700, fontSize: 13, lineHeight: 1 }}>
        {table.name}
      </span>
      <span style={{ color: s.text, fontSize: 10, opacity: 0.85, marginTop: 2 }}>
        {table.capacity}p
      </span>
      {showClient && (
        <span style={{
          color: s.text, fontSize: 9, opacity: 0.85,
          maxWidth: sz - 8, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1,
        }}>
          {assignment.client_name}
        </span>
      )}
      {d.at && (
        <span style={{ color: s.text, fontSize: 9, opacity: d.upcoming ? 0.7 : 0.8 }}>
          {d.late ? '⏳ ' : ''}{heureCourte(d.at)}
        </span>
      )}
      {plusieursServices && (
        <span
          title={`${nbServices} services dans la journée`}
          style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 17, height: 17, padding: '0 4px',
            borderRadius: 9, background: '#1a1a2e', color: '#fff',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}
        >
          ×{nbServices}
        </span>
      )}
    </div>
  )
}

// ─── Bandeau réservations à placer ───────────────────────────────────────────

function BandeauAplacer({ reservations, aVenir = 0, jourLabel = "aujourd'hui", onPlace }) {
  if (!reservations.length) {
    // Rien à placer aujourd'hui, mais des réservations arrivent : on le signale
    // discrètement plutôt que de masquer complètement l'information.
    if (!aVenir) return null
    return (
      <p className="text-xs text-gray-400 mb-4">
        Aucune réservation à placer {jourLabel} · {aVenir} sur les autres jours
      </p>
    )
  }
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <p className="text-sm font-semibold text-amber-800">
          {reservations.length} réservation{reservations.length > 1 ? 's' : ''} à placer {jourLabel}
        </p>
        {aVenir > 0 && (
          <span className="text-xs text-amber-600/70">· {aVenir} sur les autres jours</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {reservations.map((r) => (
          <button
            key={r.id}
            onClick={() => onPlace(r)}
            className="flex items-center gap-2 bg-white border border-amber-200 hover:border-amber-400 rounded-xl px-3 py-2 text-xs transition-colors group"
          >
            <span className="font-medium text-[#1a1a2e]">{r.prenom} {r.nom}</span>
            <span className="text-gray-400">·</span>
            {/* Le bandeau ne liste que la journée affichée : l'heure suffit */}
            <span className="text-amber-700 font-semibold">
              {formatHeure(r.heure)}
            </span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">{r.nb_personnes}p</span>
            <span className="text-amber-600 group-hover:text-amber-800 ml-1">→ placer</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-amber-600 mt-2">
        Cliquez sur une réservation, puis tapez la table sur le plan pour l'y assigner.
      </p>
    </div>
  )
}

// ─── Modal service ────────────────────────────────────────────────────────────

function ServiceModal({ table, assignment, derived, pendingResa, onClose, onAction }) {
  const d = derived || { status: assignment?.status || 'libre' }
  const s = STATUS[d.status] || STATUS.libre

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full sm:max-w-sm bg-white sm:rounded-2xl rounded-t-3xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.bg }}>
              <span className="text-white font-bold text-sm">{table.name}</span>
            </div>
            <div>
              <p className="font-semibold text-[#1a1a2e]">{table.name} — {table.capacity} personnes</p>
              <p className="text-xs text-gray-400">
                {s.label}
                {d.late ? ' · en retard' : ''}
                {d.upcoming ? ' · réservée plus tard' : ''}
                {d.status !== 'libre' && assignment?.client_name ? ` · ${assignment.client_name}` : ''}
                {d.at ? ` · ${heureCourte(d.at)}` : ''}
              </p>
            </div>
          </div>

          {/* Info client actuel */}
          {assignment?.client_name && (
            <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 text-sm space-y-0.5">
              <p className="font-medium text-[#1a1a2e]">{assignment.client_name}</p>
              {assignment.nb_persons && <p className="text-gray-500 text-xs">{assignment.nb_persons} personnes</p>}
              {assignment.notes && <p className="text-gray-400 text-xs">Réservation à {assignment.notes.split(' · ')[0]}</p>}
              {assignment.notes && <p className="text-gray-400 text-xs italic">{assignment.notes}</p>}
            </div>
          )}

          {/* Réservation en attente de placement sur cette table */}
          {pendingResa && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">Réservation à placer ici :</p>
              <p className="text-sm font-medium text-[#1a1a2e]">{pendingResa.prenom} {pendingResa.nom}</p>
              <p className="text-xs text-amber-700">{formatHeure(pendingResa.heure)} · {pendingResa.nb_personnes} personnes</p>
              <button
                onClick={() => onAction('link_resa', pendingResa)}
                className="mt-2 w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Confirmer l'assignation
              </button>
            </div>
          )}
        </div>

        {/* Changement de statut */}
        <div className="p-4 space-y-1.5">
          <p className="text-xs font-medium text-gray-400 mb-2 px-1">Changer le statut</p>
          {Object.entries(STATUS).map(([st, info]) => {
            const isCurrent = d.status === st
            return (
              <button
                key={st}
                onClick={() => onAction('status', st)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isCurrent ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: info.bg }} />
                <span className="text-[#1a1a2e]">{info.label}</span>
                {isCurrent && <span className="ml-auto text-xs text-gray-400">actuel</span>}
              </button>
            )
          })}

          <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
            <button
              onClick={() => onAction('assign')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[#1a6bff] hover:bg-blue-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Assigner un client walk-in
            </button>
            <button
              onClick={() => onAction('choose_resa')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Lier à une réservation en ligne
            </button>
          </div>
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Modal : choisir une réservation à lier ───────────────────────────────────

function ChooseResaModal({ table, reservationsNonPlacees, onClose, onLink }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full sm:max-w-sm bg-white sm:rounded-2xl rounded-t-3xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <p className="font-semibold text-[#1a1a2e]">Lier une réservation à {table.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">Réservations du jour sans table assignée</p>
        </div>

        <div className="p-4 max-h-80 overflow-y-auto">
          {reservationsNonPlacees.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Aucune réservation en attente de placement aujourd'hui.
            </p>
          ) : (
            <div className="space-y-2">
              {reservationsNonPlacees.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onLink(r)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-amber-300 hover:bg-amber-50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-700 font-bold text-sm">{formatHeure(r.heure)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1a1a2e] text-sm">{r.prenom} {r.nom}</p>
                    <p className="text-xs text-gray-400">{r.nb_personnes} personnes{r.message ? ` · ${r.message}` : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    r.statut === 'confirmée' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {r.statut === 'confirmée' ? 'Confirmée' : 'En attente'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Modal walk-in ────────────────────────────────────────────────────────────

function AssignModal({ table, onClose, onSave }) {
  const [form, setForm] = useState({ client_name: '', nb_persons: table?.capacity || 2, notes: '' })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full sm:max-w-sm bg-white sm:rounded-2xl rounded-t-3xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <p className="font-semibold text-[#1a1a2e]">Client walk-in — {table?.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">Client sans réservation en ligne</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">Nom du client (optionnel)</label>
            <input
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e] transition-colors"
              placeholder="Laissez vide si pas le temps !"
              value={form.client_name}
              onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">Nombre de personnes</label>
            <input
              type="number" min={1} max={20}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e] transition-colors"
              value={form.nb_persons}
              onChange={(e) => setForm((f) => ({ ...f, nb_persons: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">Note (optionnel)</label>
            <input
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e] transition-colors"
              placeholder="Allergie, anniversaire..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <button
            onClick={() => onSave({ ...form, client_name: form.client_name.trim() || 'Sans nom' })}
            className="w-full py-3 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a4e] transition-colors disabled:opacity-50"
          >
            Assigner et marquer Occupée
          </button>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Modal édition table (config) ─────────────────────────────────────────────

function EditTableModal({ table, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    name: table.name,
    capacity: table.capacity,
    shape: table.shape || 'round',
    duration_minutes: table.duration_minutes || TABLE_DEFAULT_DURATION,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full sm:max-w-sm bg-white sm:rounded-2xl rounded-t-3xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <p className="font-semibold text-[#1a1a2e]">Modifier {table.name}</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">Nom</label>
            <input
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e] transition-colors"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">Capacité</label>
            <input
              type="number" min={1} max={20}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e] transition-colors"
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">Forme</label>
            <div className="flex gap-2">
              {[['round', 'Ronde'], ['rect', 'Rectangulaire']].map(([v, l]) => (
                <button key={v} type="button"
                  onClick={() => setForm((f) => ({ ...f, shape: v }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.shape === v ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">Durée de service (min)</label>
            <select
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e] transition-colors"
              value={form.duration_minutes}
              onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
            >
              {[60, 75, 90, 105, 120, 150, 180].map((m) => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onSave(form)}
              className="flex-1 py-3 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a4e] transition-colors"
            >
              Sauvegarder
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-3 bg-red-50 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Supprimer
            </button>
          </div>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function PlanDeSalle() {
  const { user } = useAuth()
  const [restoId, setRestoId] = useState(null)
  const [tables, setTables] = useState([])
  const [services, setServices] = useState([])           // services du jour, toutes tables
  const [horaires, setHoraires] = useState([])           // pour construire les créneaux
  const [heureVue, setHeureVue] = useState(null)         // moment affiché (HH:MM)
  const [now, setNow] = useState(() => Date.now())       // horloge du plan (tick 30 s)
  const [dateVue, setDateVue] = useState(() => today())  // journée affichée
  const [reservations, setReservations] = useState([])   // réservations du jour
  const [zone, setZone] = useState('salle')
  const [configMode, setConfigMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  // Sélection en cours dans le bandeau (réservation à placer)
  const [resaEnCours, setResaEnCours] = useState(null)

  // Modals
  const [serviceModal, setServiceModal] = useState(null)
  const [assignModal, setAssignModal] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [chooseResaModal, setChooseResaModal] = useState(null)

  // Drag & drop
  const dragging = useRef(null)
  const canvasRef = useRef(null)

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000)
  }

  // ── Chargement ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    loadAll()
  }, [user, dateVue])

  const loadAll = async () => {
    setLoading(true)
    const { data: resto } = await supabase
      .from('restaurants').select('id').eq('user_id', user.id).single()
    if (!resto) { setLoading(false); return }
    setRestoId(resto.id)

    const [{ data: tablesData }, { data: assignData }, { data: horairesData }, { data: resaData }] = await Promise.all([
      supabase.from('plan_tables').select('*').eq('restaurant_id', resto.id).order('name'),
      supabase.from('table_assignments').select('*')
        .eq('restaurant_id', resto.id)
        .eq('service_date', dateVue),
      supabase.from('horaires').select('*').eq('restaurant_id', resto.id),
      supabase.from('reservations')
        .select('*')
        .eq('restaurant_id', resto.id)
        // on remonte jusqu'au jour consulté s'il est antérieur à aujourd'hui,
        // sinon le plan d'une journée passée apparaîtrait vide
        .gte('date', dateVue < today() ? dateVue : today())
        .in('statut', ['confirmée', 'en_attente'])
        .order('date')
        .order('heure'),
    ])

    setTables(tablesData || [])
    setReservations(resaData || [])

    setHoraires(horairesData || [])
    setServices(assignData || [])
    setLoading(false)
  }

  // ── Realtime ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!restoId) return
    const channel = supabase
      .channel('plan-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'table_assignments',
        filter: `restaurant_id=eq.${restoId}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setServices((prev) => prev.filter((a) => a.id !== payload.old.id))
        } else if (payload.new.service_date === dateVue) {
          setServices((prev) => [...prev.filter((a) => a.id !== payload.new.id), payload.new])
        }
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'reservations',
        filter: `restaurant_id=eq.${restoId}`,
      }, (payload) => {
        // Nouvelle réservation reçue en temps réel
        const r = payload.new
        if (r.date === dateVue && ['confirmée', 'en_attente'].includes(r.statut)) {
          setReservations((prev) => [...prev, r].sort((a, b) => a.heure.localeCompare(b.heure)))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [restoId, dateVue])

  // ── Créneaux du jour affiché ───────────────────────────────────────────────
  // Le plan montre la salle à un instant précis : sans cela, impossible de
  // distinguer la tournée de 19 h de celle de 21 h sur la même table.
  const JOURS_SEM = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

  const creneauxJour = (() => {
    const h = horaires.find(
      (x) => x.jour === JOURS_SEM[new Date(dateVue + 'T12:00:00').getDay()]
    )
    if (!h || !h.ouvert) return []
    const out = []
    for (const [debut, fin] of [[h.midi_debut, h.midi_fin], [h.soir_debut, h.soir_fin]]) {
      if (!debut || !fin) continue
      const [hd, md] = debut.split(':').map(Number)
      const [hf, mf] = fin.split(':').map(Number)
      for (let m = hd * 60 + md; m <= hf * 60 + mf - 30; m += 30) {
        out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
      }
    }
    return out
  })()

  // Par défaut : l'heure courante si l'on est dans un service, sinon le début
  // du prochain service de la journée.
  useEffect(() => {
    if (creneauxJour.length === 0) { setHeureVue(null); return }
    if (heureVue && creneauxJour.includes(heureVue)) return
    if (estAujourdhui) {
      const maintenant = new Date().toTimeString().slice(0, 5)
      const suivant = creneauxJour.find((c) => c >= maintenant)
      setHeureVue(suivant || creneauxJour[creneauxJour.length - 1])
    } else {
      setHeureVue(creneauxJour[0])
    }
  }, [horaires, dateVue])

  // ── Horloge : recalcule les statuts affichés toutes les 30 s ────────────────

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  // ── Libération des tables périmées ──────────────────────────────────────────
  // Filet côté client (effet immédiat à l'écran) — un job pg_cron fait le même
  // travail toutes les 15 min même si personne n'a l'app ouverte, ce qui garde
  // le calcul de capacité des réservations en ligne juste.

  const sweeping = useRef(new Set())

  useEffect(() => {
    // Uniquement sur la journée en cours : sur un autre jour, on consulte une
    // préparation, il n'y a rien à libérer.
    if (dateVue !== today()) return
    const perimees = services.filter(
      (a) => deriveStatus(a, now).expired && !sweeping.current.has(a.id)
    )
    if (perimees.length === 0) return

    perimees.forEach((a) => sweeping.current.add(a.id))
    const ids = perimees.map((a) => a.id)

    supabase
      .from('table_assignments')
      .delete()
      .in('id', ids)
      .then(({ error }) => {
        if (!error) setServices((prev) => prev.filter((a) => !ids.includes(a.id)))
        ids.forEach((id) => sweeping.current.delete(id))
      })
  }, [services, now, dateVue])

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e, tableId) => {
    if (!configMode) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const table = tables.find((t) => t.id === tableId)
    dragging.current = {
      tableId,
      startX: e.clientX, startY: e.clientY,
      origXPct: table.x_pct, origYPct: table.y_pct,
      canvasW: rect.width, canvasH: rect.height,
    }
    e.preventDefault()
  }, [configMode, tables])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      const { tableId, startX, startY, origXPct, origYPct, canvasW, canvasH } = dragging.current
      const newX = clamp(origXPct + ((e.clientX - startX) / canvasW) * 100, 5, 95)
      const newY = clamp(origYPct + ((e.clientY - startY) / canvasH) * 100, 5, 95)
      setTables((prev) => prev.map((t) => t.id === tableId ? { ...t, x_pct: newX, y_pct: newY } : t))
    }
    const onUp = async () => {
      if (!dragging.current) return
      const { tableId } = dragging.current
      const table = tables.find((t) => t.id === tableId)
      dragging.current = null
      if (table) await supabase.from('plan_tables').update({ x_pct: table.x_pct, y_pct: table.y_pct }).eq('id', tableId)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [tables])

  // ── Lier une réservation à une table ────────────────────────────────────────

  const linkResaToTable = async (table, resa) => {
    const serviceAt = new Date(`${resa.date}T${formatHeure(resa.heure)}:00`).toISOString()
    // Une table peut recevoir plusieurs tournées : on ajoute un service,
    // sauf s'il en existe déjà un à la même heure (on le remplace alors).
    const existant = (servicesParTable[table.id] || []).find(
      (a) => a.service_at && new Date(a.service_at).getTime() === new Date(serviceAt).getTime()
    )
    const payload = {
      restaurant_id: restoId,
      table_id: table.id,
      service_date: dateVue,
      reservation_id: resa.id,
      client_name: `${resa.prenom} ${resa.nom}`,
      nb_persons: resa.nb_personnes,
      notes: resa.message || null,
      status: 'reservee',
      service_at: serviceAt,
      started_at: null,
      duration_minutes: table.duration_minutes || TABLE_DEFAULT_DURATION,
    }

    if (existant) {
      const { error } = await supabase.from('table_assignments').update(payload).eq('id', existant.id)
      if (!error) setServices((prev) => prev.map((a) => a.id === existant.id ? { ...a, ...payload } : a))
    } else {
      const { data, error } = await supabase.from('table_assignments').insert(payload).select().single()
      if (!error && data) setServices((prev) => [...prev, data])
      else if (error) { showToast('Erreur : ' + error.message, 'error'); return }
    }

    setResaEnCours(null)
    setHeureVue(formatHeure(resa.heure))
    showToast(`${table.name} — ${resa.prenom} ${resa.nom} à ${formatHeure(resa.heure)}`)
  }

  // ── Tap sur une table (mode service) ────────────────────────────────────────

  const handleTableTap = (table) => {
    if (configMode) return
    // Si une réservation est en cours de placement, on propose directement
    if (resaEnCours) {
      setServiceModal({ ...table, _pendingResa: resaEnCours })
    } else {
      setServiceModal(table)
    }
  }

  // ── Action depuis ServiceModal ───────────────────────────────────────────────

  const handleServiceAction = async (action, value) => {
    const table = serviceModal
    if (!table) return

    if (action === 'assign') {
      setServiceModal(null)
      setAssignModal(table)
      return
    }

    if (action === 'choose_resa') {
      setServiceModal(null)
      setChooseResaModal(table)
      return
    }

    if (action === 'link_resa') {
      setServiceModal(null)
      await linkResaToTable(table, value)
      return
    }

    if (action === 'status') {
      const courant = assignments[table.id]        // service affiché
      const liste = servicesParTable[table.id] || []
      const momentIso = new Date(`${dateVue}T${heureVue || '19:00'}:00`).toISOString()

      // « Libre » = le service n'existe plus. L'absence de ligne vaut
      // disponibilité, ce qui évite d'accumuler des lignes vides.
      if (value === 'libre') {
        if (courant) {
          const { error } = await supabase.from('table_assignments').delete().eq('id', courant.id)
          if (!error) setServices((prev) => prev.filter((a) => a.id !== courant.id))
        }
        setServiceModal(null)
        showToast(`${table.name} → Libre`)
        return
      }

      // Un blocage vaut pour la journée entière (service_at nul)
      if (value === 'bloquee') {
        const blocage = liste.find((a) => !a.service_at)
        if (blocage) {
          const { error } = await supabase.from('table_assignments')
            .update({ status: 'bloquee' }).eq('id', blocage.id)
          if (!error) setServices((prev) => prev.map((a) => a.id === blocage.id ? { ...a, status: 'bloquee' } : a))
        } else {
          const { data, error } = await supabase.from('table_assignments').insert({
            restaurant_id: restoId, table_id: table.id, service_date: dateVue,
            status: 'bloquee', service_at: null,
          }).select().single()
          if (!error && data) setServices((prev) => [...prev, data])
          else if (error) { showToast('Erreur : ' + error.message, 'error'); return }
        }
        setServiceModal(null)
        showToast(`${table.name} → Bloquée`)
        return
      }

      // Occupée / Réservée : on met à jour le service affiché, ou on en crée
      // un à l'heure sélectionnée.
      const update = { status: value }
      if (value === 'occupee') {
        update.started_at = new Date().toISOString()
        update.duration_minutes = table.duration_minutes || TABLE_DEFAULT_DURATION
      }

      if (courant && courant.service_at) {
        const { error } = await supabase.from('table_assignments').update(update).eq('id', courant.id)
        if (!error) setServices((prev) => prev.map((a) => a.id === courant.id ? { ...a, ...update } : a))
      } else {
        const { data, error } = await supabase.from('table_assignments').insert({
          restaurant_id: restoId, table_id: table.id, service_date: dateVue,
          service_at: momentIso,
          duration_minutes: table.duration_minutes || TABLE_DEFAULT_DURATION,
          ...update,
        }).select().single()
        if (!error && data) setServices((prev) => [...prev, data])
        else if (error) { showToast('Erreur : ' + error.message, 'error'); return }
      }

      setServiceModal(null)
      showToast(`${table.name} → ${STATUS[value].label}`)
    }
  }

  // ── Walk-in save ────────────────────────────────────────────────────────────

  const handleAssignSave = async (form) => {
    const table = assignModal
    if (!table) return
    // Un client sans réservation occupe la table à partir de maintenant
    // (ou de l'heure consultée si l'on prépare un autre service).
    const serviceAt = estAujourdhui
      ? new Date().toISOString()
      : new Date(`${dateVue}T${heureVue || '19:00'}:00`).toISOString()

    const payload = {
      restaurant_id: restoId,
      table_id: table.id,
      service_date: dateVue,
      client_name: form.client_name,
      nb_persons: form.nb_persons,
      notes: form.notes,
      status: 'occupee',
      started_at: serviceAt,
      service_at: serviceAt,
      duration_minutes: form.duration_minutes || table.duration_minutes || TABLE_DEFAULT_DURATION,
    }
    const { data, error } = await supabase.from('table_assignments').insert(payload).select().single()
    if (error) { showToast('Erreur : ' + error.message, 'error'); return }
    if (data) setServices((prev) => [...prev, data])
    setAssignModal(null)
    showToast(`${table.name} assignée à ${form.client_name}`)
  }

  // ── Edit table config ────────────────────────────────────────────────────────

  const handleEditSave = async (form) => {
    const table = editModal
    if (!table) return
    const { error } = await supabase.from('plan_tables').update(form).eq('id', table.id)
    if (!error) setTables((prev) => prev.map((t) => t.id === table.id ? { ...t, ...form } : t))
    setEditModal(null)
    showToast(`${form.name} mis à jour`)
  }

  const handleEditDelete = async () => {
    const table = editModal
    if (!table || !window.confirm(`Supprimer ${table.name} définitivement ?`)) return
    await supabase.from('plan_tables').delete().eq('id', table.id)
    await supabase.from('table_assignments').delete().eq('table_id', table.id)
    setTables((prev) => prev.filter((t) => t.id !== table.id))
    setAssignments((prev) => { const n = { ...prev }; delete n[table.id]; return n })
    setEditModal(null)
    showToast(`${table.name} supprimée`)
  }

  // ── Ajouter table ────────────────────────────────────────────────────────────

  const addTable = async () => {
    const existing = tables.filter((t) => t.zone === zone)
    const name = `T${tables.length + 1}`
    const x = 20 + (existing.length % 5) * 18
    const y = 25 + Math.floor(existing.length / 5) * 35
    const { data, error } = await supabase.from('plan_tables').insert({
      restaurant_id: restoId, name, capacity: 4, shape: 'round',
      zone, x_pct: x, y_pct: y, duration_minutes: TABLE_DEFAULT_DURATION,
    }).select().single()
    if (!error && data) {
      setTables((prev) => [...prev, data])
      showToast(`Table ${name} ajoutée`)
    }
  }

  // ── Réservations non encore placées ─────────────────────────────────────────

  // IDs des réservations déjà liées à une table
  const resaDejaPlacees = new Set(
    services.map((a) => a.reservation_id).filter(Boolean)
  )
  // Le plan de salle est une vue du jour : le bandeau ne liste que les
  // réservations d'aujourd'hui. Sans cela, un restaurant qui prend des
  // réservations deux semaines à l'avance se retrouve avec des centaines de
  // lignes illisibles au-dessus de son plan.
  const nonPlacees = reservations.filter((r) => !resaDejaPlacees.has(r.id))
  const resasNonPlacees = nonPlacees.filter((r) => r.date === dateVue)
  const resasAVenir = nonPlacees.length - resasNonPlacees.length

  // ── Rendu ────────────────────────────────────────────────────────────────────

  const visibleTables = tables.filter((t) => t.zone === zone)
  const estAujourdhui = dateVue === today()

  // Services regroupés par table, puis service couvrant l'heure sélectionnée.
  // Une table peut recevoir deux tournées : c'est le moment choisi qui décide
  // de ce qu'on affiche.
  const servicesParTable = {}
  for (const a of services) {
    ;(servicesParTable[a.table_id] ||= []).push(a)
  }

  const momentVu = heureVue
    ? new Date(`${dateVue}T${heureVue}:00`).getTime()
    : now

  const assignments = {}          // table_id → service affiché
  const derivedByTable = {}
  const nbServicesParTable = {}
  for (const t of tables) {
    const liste = servicesParTable[t.id] || []
    const courant = serviceAuMoment(liste, momentVu)
    assignments[t.id] = courant
    nbServicesParTable[t.id] = nombreServices(liste)
    // Hors du jour en cours, l'horloge n'a pas de sens : on affiche
    // l'intention de placement telle qu'elle a été préparée.
    derivedByTable[t.id] = deriveStatus(courant, now, !estAujourdhui)
  }

  const counts = {
    libre:    visibleTables.filter((t) => derivedByTable[t.id].status === 'libre').length,
    reservee: visibleTables.filter((t) => derivedByTable[t.id].status === 'reservee').length,
    occupee:  visibleTables.filter((t) => derivedByTable[t.id].status === 'occupee').length,
    bloquee:  visibleTables.filter((t) => derivedByTable[t.id].status === 'bloquee').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!restoId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-400 text-sm">Configurez d'abord votre restaurant dans l'onglet Configuration.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#1a1a2e]">Plan de salle</h1>
            {/* Navigation par jour : permet de préparer un service à l'avance */}
            <div className="flex items-center gap-1.5 mt-1">
              <button
                onClick={() => setDateVue(decalerJour(dateVue, -1))}
                disabled={configMode}
                aria-label="Jour précédent"
                className="w-6 h-6 rounded-lg text-gray-400 hover:text-[#1a1a2e] hover:bg-gray-100 transition-colors disabled:opacity-30"
              >‹</button>
              <p className={`text-xs ${estAujourdhui ? 'text-gray-400' : 'text-[#1a6bff] font-medium'}`}>
                {new Date(dateVue + 'T00:00:00').toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </p>
              <button
                onClick={() => setDateVue(decalerJour(dateVue, 1))}
                disabled={configMode}
                aria-label="Jour suivant"
                className="w-6 h-6 rounded-lg text-gray-400 hover:text-[#1a1a2e] hover:bg-gray-100 transition-colors disabled:opacity-30"
              >›</button>
              {!estAujourdhui && (
                <button
                  onClick={() => setDateVue(today())}
                  className="ml-1 text-xs text-gray-400 hover:text-[#1a1a2e] underline underline-offset-2"
                >
                  aujourd'hui
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setConfigMode((v) => !v)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  configMode ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a1a2e]'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                {configMode ? 'Mode configuration' : 'Configurer'}
              </button>
              {configMode && (
                <button
                  onClick={addTable}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-[#1a6bff] text-white hover:bg-[#1a5ce8] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter une table
                </button>
              )}
            </div>
            <button
              onClick={loadAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-[#1a1a2e] bg-white border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualiser
            </button>
          </div>
        </div>

        {/* Bandeau réservations à placer */}
        {!configMode && (
          <BandeauAplacer
            reservations={resasNonPlacees}
            aVenir={resasAVenir}
            jourLabel={estAujourdhui
              ? "aujourd'hui"
              : 'le ' + new Date(dateVue + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            onPlace={(r) => {
              setResaEnCours((prev) => prev?.id === r.id ? null : r)
            }}
          />
        )}

        {/* Indicateur de sélection active */}
        {resaEnCours && (
          <div className="bg-[#1a1a2e] text-white rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-sm font-medium">
                Placement en cours : <strong>{resaEnCours.prenom} {resaEnCours.nom}</strong> · {formatHeure(resaEnCours.heure)} · {resaEnCours.nb_personnes}p
              </p>
            </div>
            <button
              onClick={() => setResaEnCours(null)}
              className="text-gray-400 hover:text-white transition-colors ml-3"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-3 mb-5 flex-wrap">
          {Object.entries(counts).map(([st, n]) => {
            const info = STATUS[st]
            return (
              <div key={st} className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: info.bg }} />
                <span className="text-xs font-medium text-[#1a1a2e]">{n}</span>
                <span className="text-xs text-gray-400">{info.label}{n > 1 ? 's' : ''}</span>
              </div>
            )
          })}
          {resasNonPlacees.length > 0 && !configMode && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-xs font-medium text-amber-800">{resasNonPlacees.length}</span>
              <span className="text-xs text-amber-600">à placer</span>
            </div>
          )}
        </div>

        {/* Sélecteur d'heure : le plan montre la salle à cet instant */}
        {!configMode && creneauxJour.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-400">Salle à</span>
              <span className="text-sm font-semibold text-[#1a1a2e]">{heureVue || '—'}</span>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {creneauxJour.map((c) => {
                const actif = c === heureVue
                return (
                  <button
                    key={c}
                    onClick={() => setHeureVue(c)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      actif
                        ? 'bg-[#1a1a2e] text-white'
                        : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Zone toggle */}
        <div className="flex gap-1 mb-4 bg-white border border-gray-100 rounded-2xl p-1 w-fit">
          {[['salle', 'Salle'], ['terrasse', 'Terrasse']].map(([z, label]) => (
            <button
              key={z}
              onClick={() => setZone(z)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
                zone === z ? 'bg-[#1a1a2e] text-white' : 'text-gray-500 hover:text-[#1a1a2e]'
              }`}
            >
              {label}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                zone === z ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {tables.filter((t) => t.zone === z).length}
              </span>
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {configMode && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
              Mode configuration — Glissez les tables · Double-clic pour modifier
            </div>
          )}
          {resaEnCours && (
            <div className="px-4 py-2 bg-[#1a1a2e]/5 border-b border-[#1a1a2e]/10 text-xs text-[#1a1a2e] font-medium">
              Tapez une table pour y placer {resaEnCours.prenom} {resaEnCours.nom}
            </div>
          )}

          <div
            ref={canvasRef}
            className="relative w-full"
            style={{
              height: CANVAS_H,
              backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            {visibleTables.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18M10 3v18M14 3v18" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">
                  {configMode ? 'Cliquez sur "Ajouter une table" pour commencer' : 'Aucune table dans cette zone'}
                </p>
              </div>
            )}

            {visibleTables.map((table) => (
              <TableShape
                key={table.id}
                table={table}
                assignment={assignments[table.id]}
                derived={derivedByTable[table.id]}
                nbServices={nbServicesParTable[table.id] || 0}
                selected={editModal?.id === table.id}
                configMode={configMode}
                onTap={() => handleTableTap(table)}
                onDragStart={(e) => {
                  if (e.detail === 2) { setEditModal(table); return }
                  handleDragStart(e, table.id)
                }}
              />
            ))}
          </div>

          {/* Légende */}
          <div className="border-t border-gray-50 px-5 py-3 flex items-center gap-4 flex-wrap">
            {Object.entries(STATUS).map(([st, info]) => (
              <span key={st} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: info.bg }} />
                {info.label}
              </span>
            ))}
          </div>
        </div>

        {/* Mobile : boutons config */}
        <div className="md:hidden mt-4 flex gap-2">
          <button
            onClick={() => setConfigMode((v) => !v)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-colors ${
              configMode ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {configMode ? 'Quitter configuration' : 'Configurer le plan'}
          </button>
          {configMode && (
            <button
              onClick={addTable}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium bg-[#1a6bff] text-white hover:bg-[#1a5ce8] transition-colors"
            >
              + Ajouter
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      {serviceModal && (
        <ServiceModal
          table={serviceModal}
          assignment={assignments[serviceModal.id]}
          derived={derivedByTable[serviceModal.id]}
          pendingResa={serviceModal._pendingResa || null}
          onClose={() => { setServiceModal(null); setResaEnCours(null) }}
          onAction={handleServiceAction}
        />
      )}
      {assignModal && (
        <AssignModal
          table={assignModal}
          onClose={() => setAssignModal(null)}
          onSave={handleAssignSave}
        />
      )}
      {chooseResaModal && (
        <ChooseResaModal
          table={chooseResaModal}
          reservationsNonPlacees={resasNonPlacees}
          onClose={() => setChooseResaModal(null)}
          onLink={async (resa) => {
            setChooseResaModal(null)
            await linkResaToTable(chooseResaModal, resa)
          }}
        />
      )}
      {editModal && (
        <EditTableModal
          table={editModal}
          onClose={() => setEditModal(null)}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
        />
      )}

      <Toast message={toast.message} type={toast.type} />
    </div>
  )
}
