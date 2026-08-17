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
  // Dernière arrivée : 1h avant la fin du service
  const slots = []
  let cur = timeToMinutes(debut)
  const end = timeToMinutes(fin) - 60
  while (cur <= end) {
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
  const [fermetures, setFermetures] = useState([])
  const [waitlistJoined, setWaitlistJoined] = useState(false)
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false)

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

      const { data: fermeturesData } = await supabase
        .from('fermetures')
        .select('date')
        .eq('restaurant_id', restoData.id)
      setFermetures((fermeturesData || []).map((f) => f.date))

      setLoading(false)
    }
    load()
  }, [slug])

  // Créneaux calculés côté serveur : ils portent la disponibilité réelle
  // (capacité + délai minimum), ce qui évite au client de découvrir un refus
  // après avoir rempli tout le formulaire.
  const [creneaux, setCreneaux] = useState(null)
  const [chargementCreneaux, setChargementCreneaux] = useState(false)

  useEffect(() => {
    if (!resto?.id || !form.date) { setCreneaux(null); return }
    let annule = false
    setChargementCreneaux(true)
    supabase
      .rpc('creneaux_disponibilite', {
        p_restaurant_id: resto.id,
        p_date: form.date,
        p_personnes: Number(form.nb_personnes) || 2,
      })
      .then(({ data, error }) => {
        if (annule) return
        setChargementCreneaux(false)
        // En cas d'échec, repli sur le calcul local plutôt que de bloquer
        if (error || !data) {
          const locaux = fermetures.includes(form.date)
            ? []
            : getSlotsForDate(horaires, form.date)
          setCreneaux(locaux.map((h) => ({ heure: h, disponible: true })))
        } else {
          setCreneaux(data)
        }
      })
    return () => { annule = true }
  }, [resto?.id, form.date, form.nb_personnes, horaires, fermetures])

  const slots = creneaux || []
  const slotsLibres = slots.filter((s) => s.disponible)

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
      statut: 'confirmée',
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

  const handleJoinWaitlist = async () => {
    if (!form.prenom || !form.nom || !form.email || !form.telephone) {
      setError('Prénom, nom, email et téléphone sont nécessaires pour la liste d\'attente.')
      return
    }
    setWaitlistSubmitting(true)
    const { error: err } = await supabase.from('liste_attente').insert({
      restaurant_id: resto.id,
      prenom: form.prenom,
      nom: form.nom,
      email: form.email,
      telephone: form.telephone,
      date: form.date,
      nb_personnes: Number(form.nb_personnes),
      message: form.message || null,
    })
    setWaitlistSubmitting(false)
    if (err) {
      console.error(err)
      setError('Une erreur est survenue. Veuillez réessayer.')
      return
    }
    setWaitlistJoined(true)
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
  const jourFerme = form.date && !chargementCreneaux && creneaux !== null && slots.length === 0
  const journeeComplete = form.date && slots.length > 0 && slotsLibres.length === 0

  return (
    <div
      className={isWidget ? '' : 'min-h-screen flex flex-col'}
      style={{
        backgroundColor: resto.widget_bg_color || '#ffffff',
        backgroundImage: resto.widget_bg_image_url ? `url('${resto.widget_bg_image_url}')` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Header — masqué en mode widget */}
      {!isWidget && (
        <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-center">
          <Logo size="sm" />
        </header>
      )}

      <div className={isWidget ? 'p-4' : 'flex-1 max-w-lg mx-auto w-full px-6 py-10'}>
        {/* Photo principale — masquée en mode widget : le site du restaurant
            montre déjà ses propres photos autour du widget. */}
        {!isWidget && resto.photos?.length > 0 && (
          <div className="mb-6 -mx-6 sm:mx-0">
            <img
              src={resto.photos[0]}
              alt={resto.nom}
              className="w-full h-56 sm:h-64 sm:rounded-2xl object-cover"
            />
            {resto.photos.length > 1 && (
              <div className="flex gap-2 mt-2 px-6 sm:px-0 overflow-x-auto pb-1">
                {resto.photos.slice(1).map((url) => (
                  <img key={url} src={url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
                ))}
              </div>
            )}
          </div>
        )}

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
            {resto.menu_url && (
              <a
                href={resto.menu_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-[#2563EB] hover:underline"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Voir le menu
              </a>
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
              ) : chargementCreneaux ? (
                <div className={`${inputCls} text-gray-300`}>
                  Recherche des disponibilités…
                </div>
              ) : jourFerme ? (
                <div className={`${inputCls} text-orange-400 bg-orange-50 border-orange-100`}>
                  Le restaurant est fermé ce jour-là
                </div>
              ) : journeeComplete ? (
                <div className={`${inputCls} text-orange-400 bg-orange-50 border-orange-100`}>
                  {Number(form.nb_personnes) > 2
                    ? `Plus aucune table pour ${form.nb_personnes} personnes — essayez une autre date`
                    : 'Plus aucune disponibilité — essayez une autre date'}
                </div>
              ) : (
                <select name="heure" value={form.heure} onChange={handleChange}
                  required className={inputCls}>
                  <option value="">Choisir un horaire</option>
                  {slots.map((s) => (
                    <option key={s.heure} value={s.disponible ? s.heure : ''} disabled={!s.disponible}>
                      {s.heure}{s.disponible ? '' : s.trop_tot ? ' — trop proche' : ' — complet'}
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Liste d'attente : la seule option laissée au client quand la
                journée est pleine, plutôt que de le renvoyer sans rien. */}
            {journeeComplete && (
              waitlistJoined ? (
                <div className="bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-xl">
                  Vous êtes sur la liste d'attente pour cette date. {resto.nom} vous contactera en cas de désistement.
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-700 mb-2">
                    Aucune table libre, mais vous pouvez laisser vos coordonnées : on vous appelle en cas de désistement.
                  </p>
                  <button
                    type="button"
                    disabled={waitlistSubmitting}
                    onClick={handleJoinWaitlist}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {waitlistSubmitting ? 'Envoi…' : 'Rejoindre la liste d\'attente'}
                  </button>
                </div>
              )
            )}

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
              className="w-full py-3.5 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              style={{ backgroundColor: submitting || jourFerme || !form.date ? undefined : (resto.widget_primary_color || '#1a1a2e') }}
            >
              {submitting ? 'Envoi en cours...' : (resto.widget_button_text || 'Confirmer la réservation')}
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
