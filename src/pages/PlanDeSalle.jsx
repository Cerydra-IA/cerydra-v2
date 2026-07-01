import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Navbar from '../components/dashboard/Navbar'

// ─── Constantes ──────────────────────────────────────────────────────────────

const STATUS = {
  libre:    { label: 'Libre',     bg: '#22c55e', text: '#fff', ring: '#16a34a' },
  reservee: { label: 'Réservée',  bg: '#f59e0b', text: '#fff', ring: '#d97706' },
  occupee:  { label: 'Occupée',   bg: '#ef4444', text: '#fff', ring: '#dc2626' },
  bloquee:  { label: 'Bloquée',   bg: '#9ca3af', text: '#fff', ring: '#6b7280' },
}

const TABLE_DEFAULT_DURATION = 90 // minutes
const CANVAS_H = 480 // px, fixed height for the plan

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isMobile() {
  return window.innerWidth < 768
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

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

// Icône table pour le plan
function TableShape({ table, assignment, selected, onTap, onDragStart, configMode }) {
  const s = STATUS[assignment?.status || 'libre']
  const isActive = selected

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
        width: table.capacity <= 2 ? 52 : table.capacity <= 4 ? 64 : 78,
        height: table.capacity <= 2 ? 52 : table.capacity <= 4 ? 64 : 78,
        backgroundColor: s.bg,
        border: `3px solid ${isActive ? '#1a6bff' : s.ring}`,
        borderRadius: table.shape === 'round' ? '50%' : '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: configMode ? 'grab' : 'pointer',
        userSelect: 'none',
        boxShadow: isActive ? '0 0 0 3px #1a6bff44' : '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        zIndex: isActive ? 10 : 1,
      }}
    >
      <span style={{ color: s.text, fontWeight: 700, fontSize: 13, lineHeight: 1 }}>
        {table.name}
      </span>
      <span style={{ color: s.text, fontSize: 10, opacity: 0.85, marginTop: 2 }}>
        {table.capacity}p
      </span>
      {assignment?.client_name && (
        <span style={{ color: s.text, fontSize: 9, opacity: 0.8, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
          {assignment.client_name}
        </span>
      )}
    </div>
  )
}

// Modal d'action en mode service
function ServiceModal({ table, assignment, onClose, onAction }) {
  const s = STATUS[assignment?.status || 'libre']

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
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
              <p className="text-xs text-gray-400">{s.label}{assignment?.client_name ? ` · ${assignment.client_name}` : ''}</p>
            </div>
          </div>
          {assignment?.client_name && (
            <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 text-sm">
              <p className="font-medium text-[#1a1a2e]">{assignment.client_name}</p>
              {assignment.nb_persons && <p className="text-gray-500 text-xs mt-0.5">{assignment.nb_persons} personnes</p>}
              {assignment.notes && <p className="text-gray-400 text-xs mt-0.5 italic">{assignment.notes}</p>}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2">
          {['libre', 'reservee', 'occupee', 'bloquee'].map((st) => {
            const info = STATUS[st]
            const isCurrent = (assignment?.status || 'libre') === st
            return (
              <button
                key={st}
                onClick={() => onAction('status', st)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isCurrent ? 'ring-2 ring-offset-1' : 'hover:bg-gray-50'
                }`}
                style={isCurrent ? { ringColor: info.ring } : {}}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: info.bg }} />
                <span className="text-[#1a1a2e]">Marquer {info.label.toLowerCase()}</span>
                {isCurrent && <span className="ml-auto text-xs text-gray-400">actuel</span>}
              </button>
            )
          })}

          <div className="border-t border-gray-100 pt-2 mt-2">
            <button
              onClick={() => onAction('assign')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#1a6bff] hover:bg-blue-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Assigner un client
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

// Modal d'assignation client
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
          <p className="font-semibold text-[#1a1a2e]">Assigner à {table?.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">Client en salle sans réservation en ligne</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">Nom du client</label>
            <input
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e] transition-colors"
              placeholder="Marie Dupont"
              value={form.client_name}
              onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">Nombre de personnes</label>
            <input
              type="number"
              min={1}
              max={20}
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
            onClick={() => onSave(form)}
            className="w-full py-3 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a4e] transition-colors"
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

// Modal d'édition d'une table (mode config)
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
            <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">Capacité (personnes)</label>
            <input
              type="number"
              min={1}
              max={20}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e] transition-colors"
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">Forme</label>
            <div className="flex gap-2">
              {[['round', 'Ronde'], ['rect', 'Rectangulaire']].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, shape: v }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.shape === v ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {l}
                </button>
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
                <option key={m} value={m}>{m} min ({Math.floor(m / 60)}h{m % 60 ? String(m % 60).padStart(2, '0') : ''})</option>
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
  const [assignments, setAssignments] = useState({}) // table_id → assignment
  const [zone, setZone] = useState('salle')
  const [configMode, setConfigMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  // Modals
  const [serviceModal, setServiceModal] = useState(null) // table
  const [assignModal, setAssignModal] = useState(null)   // table
  const [editModal, setEditModal] = useState(null)       // table

  // Drag & drop config mode
  const dragging = useRef(null) // { tableId, startX, startY, origX, origY }
  const canvasRef = useRef(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000)
  }

  // ── Chargement ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    loadAll()
  }, [user])

  const loadAll = async () => {
    setLoading(true)
    const { data: resto } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!resto) { setLoading(false); return }
    setRestoId(resto.id)

    const [{ data: tablesData }, { data: assignData }] = await Promise.all([
      supabase.from('plan_tables').select('*').eq('restaurant_id', resto.id).order('name'),
      supabase.from('table_assignments').select('*').eq('restaurant_id', resto.id),
    ])

    setTables(tablesData || [])

    // Map assignments par table_id (on prend le plus récent actif)
    const map = {}
    for (const a of assignData || []) {
      map[a.table_id] = a
    }
    setAssignments(map)
    setLoading(false)
  }

  // ── Realtime ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!restoId) return
    const channel = supabase
      .channel('plan-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'table_assignments',
        filter: `restaurant_id=eq.${restoId}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setAssignments((prev) => {
            const next = { ...prev }
            delete next[payload.old.table_id]
            return next
          })
        } else {
          setAssignments((prev) => ({
            ...prev,
            [payload.new.table_id]: payload.new,
          }))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [restoId])

  // ── Drag & drop (mode config) ────────────────────────────────────────────────

  const handleDragStart = useCallback((e, tableId) => {
    if (!configMode) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const table = tables.find((t) => t.id === tableId)
    dragging.current = {
      tableId,
      startX: e.clientX,
      startY: e.clientY,
      origXPct: table.x_pct,
      origYPct: table.y_pct,
      canvasW: rect.width,
      canvasH: rect.height,
    }
    e.preventDefault()
  }, [configMode, tables])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      const { tableId, startX, startY, origXPct, origYPct, canvasW, canvasH } = dragging.current
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const newX = clamp(origXPct + (dx / canvasW) * 100, 5, 95)
      const newY = clamp(origYPct + (dy / canvasH) * 100, 5, 95)
      setTables((prev) => prev.map((t) => t.id === tableId ? { ...t, x_pct: newX, y_pct: newY } : t))
    }

    const onUp = async () => {
      if (!dragging.current) return
      const { tableId } = dragging.current
      const table = tables.find((t) => t.id === tableId)
      dragging.current = null
      if (table) {
        await supabase.from('plan_tables').update({ x_pct: table.x_pct, y_pct: table.y_pct }).eq('id', tableId)
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [tables])

  // ── Actions ──────────────────────────────────────────────────────────────────

  const addTable = async () => {
    const existing = tables.filter((t) => t.zone === zone)
    const name = `T${tables.length + 1}`
    const x = 20 + (existing.length % 5) * 18
    const y = 25 + Math.floor(existing.length / 5) * 35

    const { data, error } = await supabase.from('plan_tables').insert({
      restaurant_id: restoId,
      name,
      capacity: 4,
      shape: 'round',
      zone,
      x_pct: x,
      y_pct: y,
      duration_minutes: TABLE_DEFAULT_DURATION,
    }).select().single()

    if (!error && data) {
      setTables((prev) => [...prev, data])
      showToast(`Table ${name} ajoutée`)
    }
  }

  const handleServiceAction = async (action, value) => {
    const table = serviceModal
    if (!table) return

    if (action === 'assign') {
      setServiceModal(null)
      setAssignModal(table)
      return
    }

    if (action === 'status') {
      const existing = assignments[table.id]
      if (existing) {
        const { error } = await supabase
          .from('table_assignments')
          .update({ status: value, client_name: value === 'libre' ? null : existing.client_name, nb_persons: value === 'libre' ? null : existing.nb_persons })
          .eq('id', existing.id)
        if (!error) {
          setAssignments((prev) => ({ ...prev, [table.id]: { ...existing, status: value } }))
        }
      } else {
        const { data, error } = await supabase.from('table_assignments').insert({
          restaurant_id: restoId,
          table_id: table.id,
          status: value,
        }).select().single()
        if (!error && data) {
          setAssignments((prev) => ({ ...prev, [table.id]: data }))
        }
      }
      setServiceModal(null)
      showToast(`${table.name} → ${STATUS[value].label}`)
    }
  }

  const handleAssignSave = async (form) => {
    const table = assignModal
    if (!table) return
    const existing = assignments[table.id]

    const payload = {
      restaurant_id: restoId,
      table_id: table.id,
      client_name: form.client_name,
      nb_persons: form.nb_persons,
      notes: form.notes,
      status: 'occupee',
      started_at: new Date().toISOString(),
      duration_minutes: table.duration_minutes || TABLE_DEFAULT_DURATION,
    }

    if (existing) {
      const { error } = await supabase.from('table_assignments').update(payload).eq('id', existing.id)
      if (!error) setAssignments((prev) => ({ ...prev, [table.id]: { ...existing, ...payload } }))
    } else {
      const { data, error } = await supabase.from('table_assignments').insert(payload).select().single()
      if (!error && data) setAssignments((prev) => ({ ...prev, [table.id]: data }))
    }

    setAssignModal(null)
    showToast(`${table.name} assignée à ${form.client_name}`)
  }

  const handleEditSave = async (form) => {
    const table = editModal
    if (!table) return
    const { error } = await supabase.from('plan_tables').update(form).eq('id', table.id)
    if (!error) {
      setTables((prev) => prev.map((t) => t.id === table.id ? { ...t, ...form } : t))
      showToast(`${form.name} mis à jour`)
    }
    setEditModal(null)
  }

  const handleEditDelete = async () => {
    const table = editModal
    if (!table) return
    if (!window.confirm(`Supprimer ${table.name} définitivement ?`)) return
    await supabase.from('plan_tables').delete().eq('id', table.id)
    await supabase.from('table_assignments').delete().eq('table_id', table.id)
    setTables((prev) => prev.filter((t) => t.id !== table.id))
    setAssignments((prev) => { const n = { ...prev }; delete n[table.id]; return n })
    setEditModal(null)
    showToast(`${table.name} supprimée`)
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────

  const visibleTables = tables.filter((t) => t.zone === zone)

  const counts = {
    libre: visibleTables.filter((t) => !assignments[t.id] || assignments[t.id].status === 'libre').length,
    reservee: visibleTables.filter((t) => assignments[t.id]?.status === 'reservee').length,
    occupee: visibleTables.filter((t) => assignments[t.id]?.status === 'occupee').length,
    bloquee: visibleTables.filter((t) => assignments[t.id]?.status === 'bloquee').length,
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
          <h1 className="text-xl font-bold text-[#1a1a2e]">Plan de salle</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode config (desktop uniquement) */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setConfigMode((v) => !v)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  configMode
                    ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a1a2e]'
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

            {/* Actualiser */}
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

        {/* Stats rapides */}
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
        </div>

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

        {/* Canvas du plan */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden relative"
          style={{ minHeight: CANVAS_H }}>

          {/* Légende mode config */}
          {configMode && (
            <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-sm border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-500 shadow-sm">
              Glissez les tables pour les repositionner · Clic pour modifier
            </div>
          )}

          {/* Canvas */}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 10h18M3 14h18M10 3v18M14 3v18" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">
                  {configMode ? 'Cliquez sur "Ajouter une table" pour commencer' : 'Aucune table configurée pour cette zone'}
                </p>
                {configMode && (
                  <button
                    onClick={addTable}
                    className="px-4 py-2 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a4e] transition-colors"
                  >
                    + Ajouter une table
                  </button>
                )}
              </div>
            )}

            {visibleTables.map((table) => (
              <TableShape
                key={table.id}
                table={table}
                assignment={assignments[table.id]}
                selected={editModal?.id === table.id}
                configMode={configMode}
                onTap={() => {
                  if (!configMode) setServiceModal(table)
                }}
                onDragStart={(e) => {
                  if (e.detail === 2) {
                    // double-clic en mode config → éditer
                    setEditModal(table)
                    return
                  }
                  handleDragStart(e, table.id)
                }}
              />
            ))}
          </div>

          {/* Légende couleurs */}
          <div className="border-t border-gray-50 px-5 py-3 flex items-center gap-4 flex-wrap">
            {Object.entries(STATUS).map(([st, info]) => (
              <span key={st} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: info.bg }} />
                {info.label}
              </span>
            ))}
            {configMode && (
              <span className="ml-auto text-xs text-gray-400">Double-clic pour modifier une table</span>
            )}
          </div>
        </div>

        {/* Mobile : bouton config + ajouter */}
        <div className="md:hidden mt-4 flex gap-2">
          <button
            onClick={() => setConfigMode((v) => !v)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-colors ${
              configMode ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            {configMode ? 'Quitter config' : 'Configurer le plan'}
          </button>
          {configMode && (
            <button
              onClick={addTable}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium bg-[#1a6bff] text-white hover:bg-[#1a5ce8] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter
            </button>
          )}
        </div>

        {/* SQL info (en config, admin) */}
        {configMode && tables.length === 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-100 text-amber-700 text-xs px-4 py-3 rounded-xl">
            <strong>À faire une fois dans Supabase :</strong> créez les tables <code>plan_tables</code> et <code>table_assignments</code>.
            Copiez le SQL depuis la documentation de configuration.
          </div>
        )}
      </div>

      {/* Modals */}
      {serviceModal && (
        <ServiceModal
          table={serviceModal}
          assignment={assignments[serviceModal.id]}
          onClose={() => setServiceModal(null)}
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
