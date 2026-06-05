import { useState, useEffect, useMemo } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Logo from '../components/Logo'

// ─── Utilitaires ──────────────────────────────────────────────────────────────

const JOURS_MAP = {
  0: 'dimanche', 1: 'lundi', 2: 'mardi', 3: 'mercredi',
  4: 'jeudi', 5: 'vendredi', 6: 'samedi',
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function generateSlots(debut, fin) {
  const slots = []
  let cur = timeToMinutes(debut)
  const end = timeToMinutes(fin)
  while (cur < end) {
    const h = String(Math.floor(cur / 60)).padStart(2, '0')
    const m = String(cur % 60).padStart(2, '0')
    slots.push(`${h}:${m}`)
    cur += 30
  }
  return slots
}

function getSlotsForDate(horaires, dateStr) {
  if (!dateStr || !horaires.length) return []
  const date = new Date(dateStr)
  const jourNom = JOURS_MAP[date.getDay()]
  const horaire = horaires.find((h) => h.jour === jourNom)
  if (!horaire || !horaire.ouvert) return []
  const midi = generateSlots(
    horaire.midi_debut.slice(0, 5),
    horaire.midi_fin.slice(0, 5)
  )
  const soir = generateSlots(
    horaire.soir_debut.slice(0, 5),
    horaire.soir_fin.slice(0, 5)
  )
  return [...midi, ...soir]
}

function getMinDate(delai) {
  const d = new Date()
  d.setHours(d.getHours() + (delai || 2))
  return d.toISOString().split('T')[0]
}

// ─── Composants UI ─────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#333] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e] transition-colors bg-white'

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ─── Page 404 ──────────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
      <Logo size="md" />
      <div className="mt-10 text-5xl mb-4">🍽️</div>
      <h1 className="text-xl font-bold text-[#1a1a2e] mb-2">Restaurant introuvable</h1>
      <p className="text-gray-400 text-sm">Cette page de réservation n'existe pas ou a été supprimée.</p>
    </div>
  )
}

// ─── Page de confirmation ──────────────────────────────────────────────────────

function Confirmation({ resto, form, isWidget }) {
  if (isWidget) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[#1a1a2e] mb-2">Réservation confirmée !</h2>
        <p className="text-gray-500 text-sm mb-4 leading-relaxed">
          {resto.message_confirmation || `Merci ${form.prenom}, votre réservation chez ${resto.nom} est bien enregistrée.`}
        </p>
        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">Date</span><span className="font-medium text-[#1a1a2e]">{new Date(form.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Heure</span><span className="font-medium text-[#1a1a2e]">{form.heure}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Personnes</span><span className="font-medium text-[#1a1a2e]">{form.nb_personnes}</span></div>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-center">
        <Logo size="sm" />
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[#1a1a2e] mb-3">Réservation confirmée !</h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            {resto.message_confirmation || `Merci ${form.prenom}, votre réservation chez ${resto.nom} est bien enregistrée.`}
          </p>

          {/* Récapitulatif */}
          <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-3 mb-8">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Restaurant</span>
              <span className="font-medium text-[#1a1a2e]">{resto.nom}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Date</span>
              <span className="font-medium text-[#1a1a2e]">
                {new Date(form.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Heure</span>
              <span className="font-medium text-[#1a1a2e]">{form.heure}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Personnes</span>
              <span className="font-medium text-[#1a1a2e]">{form.nb_personnes}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Nom</span>
              <span className="font-medium text-[#1a1a2e]">{form.prenom} {form.nom}</span>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Une confirmation a été enregistrée. À bientôt chez {resto.nom} !
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────────

const FORM_DEFAUT = {
  prenom: '', nom: '', email: '', telephone: '',
  date: '', heure: '', nb_personnes: '2', message: '',
}

export default function RestoPublic() {
  const { slug } = useParams()
  const { search } = useLocation()
  const isWidget = new URLSearchParams(search).get('widget') === 'true'
  const [resto, setResto] = useState(null)
  const [horaires, setHoraires] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(FORM_DEFAUT)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: restoData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!restoData) { setLoading(false); return }
      setResto(restoData)

      const { data: horairesData } = await supabase
        .from('horaires')
        .select('*')
        .eq('restaurant_id', restoData.id)

      setHoraires(horairesData || [])
      setLoading(false)
    }
    load()
  }, [slug])

  const slots = useMemo(() => getSlotsForDate(horaires, form.date), [horaires, form.date])

  // Quand la date change, reset l'heure si le slot actuel n'est plus disponible
  const handleDateChange = (val) => {
    setForm((f) => ({ ...f, date: val, heure: '' }))
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.heure) { setError('Veuillez sélectionner un horaire.'); return }

    setSubmitting(true)

    const { error: err } = await supabase.from('reservations').insert({
      restaurant_id: resto.id,
      prenom: form.prenom,
      nom: form.nom,
      email: form.email,
      telephone: form.telephone,
      date: form.date,
      heure: form.heure,
      nb_personnes: Number(form.nb_personnes),
      message: form.message || null,
      statut: 'en_attente',
    })
    setSubmitting(false)

    if (err) {
      // Le trigger PostgreSQL renvoie 'doublon_creneau' si le créneau est déjà confirmé
      if (err.message?.includes('doublon_email')) {
        setError('Vous avez déjà une réservation pour ce créneau.')
      } else if (err.message?.includes('creneau_complet')) {
        setError('Ce créneau est complet. Veuillez choisir un autre horaire.')
      } else {
        console.error(err)
        setError('Une erreur est survenue. Veuillez réessayer.')
      }
    } else {
      setConfirmed(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!resto) return <NotFound />
  if (confirmed) return <Confirmation resto={resto} form={form} isWidget={isWidget} />

  const minDate = getMinDate(resto.delai_minimum_heures)
  const jourFerme = form.date && slots.length === 0

  return (
    <div className={isWidget ? 'bg-white' : 'min-h-screen bg-white flex flex-col'}>
      {/* Header — masqué en mode widget */}
      {!isWidget && (
        <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-center">
          <Logo size="sm" />
        </header>
      )}

      <div className={isWidget ? 'p-4' : 'flex-1 max-w-lg mx-auto w-full px-6 py-10'}>
        {/* Infos restaurant — masquées en mode widget */}
        {!isWidget && (
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#1a1a2e] mb-1">{resto.nom}</h1>
            {resto.description && (
              <p className="text-gray-500 text-sm leading-relaxed">{resto.description}</p>
            )}
            {(resto.adresse || resto.telephone) && (
              <div className="flex flex-wrap gap-4 mt-3">
                {resto.adresse && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {resto.adresse}
                  </span>
                )}
                {resto.telephone && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
                    </svg>
                    {resto.telephone}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Formulaire */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-[#1a1a2e] mb-5">Réserver une table</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Prénom + Nom */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prénom" required>
                <input name="prenom" value={form.prenom} onChange={handleChange}
                  required className={inputCls} placeholder="Jean" />
              </FormField>
              <FormField label="Nom" required>
                <input name="nom" value={form.nom} onChange={handleChange}
                  required className={inputCls} placeholder="Dupont" />
              </FormField>
            </div>

            {/* Email + Téléphone */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Email" required>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  required className={inputCls} placeholder="jean@exemple.fr" />
              </FormField>
              <FormField label="Téléphone" required>
                <input name="telephone" value={form.telephone} onChange={handleChange}
                  required className={inputCls} placeholder="06 12 34 56 78" />
              </FormField>
            </div>

            {/* Date + Nb personnes */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date" required>
                <input name="date" type="date" value={form.date}
                  min={minDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  required className={inputCls} />
              </FormField>
              <FormField label="Nombre de personnes" required>
                <select name="nb_personnes" value={form.nb_personnes} onChange={handleChange}
                  required className={inputCls}>
                  {Array.from({ length: resto.nb_couverts_max || 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} personne{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Heure */}
            <FormField label="Heure" required>
              {!form.date ? (
                <div className={`${inputCls} text-gray-300 cursor-not-allowed`}>
                  Sélectionnez d'abord une date
                </div>
              ) : jourFerme ? (
                <div className={`${inputCls} text-orange-400 bg-orange-50 border-orange-100`}>
                  Le restaurant est fermé ce jour-là
                </div>
              ) : (
                <select name="heure" value={form.heure} onChange={handleChange}
                  required className={inputCls}>
                  <option value="">Choisir un horaire</option>
                  {slots.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Message */}
            <FormField label="Message" >
              <textarea name="message" value={form.message} onChange={handleChange}
                rows={3} className={`${inputCls} resize-none`}
                placeholder="Allergies, occasion spéciale, chaise haute..." />
            </FormField>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-500 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || jourFerme || !form.date}
              className="w-full py-3.5 bg-[#1a1a2e] text-white rounded-xl font-medium text-sm hover:bg-[#2a2a4e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
            >
              {submitting ? 'Envoi en cours...' : 'Confirmer la réservation'}
            </button>
          </form>
        </div>

        {!isWidget && (
          <p className="text-center text-xs text-gray-300 mt-6">
            Propulsé par <span className="font-medium text-gray-400">CERYDRA</span>
          </p>
        )}
      </div>
    </div>
  )
}
