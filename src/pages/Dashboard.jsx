import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { generateSlug } from '../lib/slug'
import Navbar from '../components/dashboard/Navbar'
import SectionCard from '../components/dashboard/SectionCard'
import { Field, inputCls, selectCls } from '../components/dashboard/Field'

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

const HORAIRES_DEFAUT = JOURS.map((jour) => ({
  jour,
  ouvert: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'].includes(jour),
  midi_debut: '12:00',
  midi_fin: '14:30',
  soir_debut: '19:00',
  soir_fin: '22:30',
}))

const RESTO_DEFAUT = {
  nom: '',
  slug: '',
  adresse: '',
  telephone: '',
  description: '',
  nb_tables: '',
  nb_couverts_max: '',
  nb_couverts_max_manuel: true,
  delai_minimum_heures: 2,
  duree_occupation_minutes: 90,
  message_confirmation: 'Merci pour votre réservation ! Nous avons hâte de vous accueillir.',
  widget_primary_color: '#1a1a2e',
  widget_bg_color: '#ffffff',
  widget_button_text: 'Réserver',
  widget_bg_image_url: '',
}

function Toast({ message, type }) {
  if (!message) return null
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium transition-all ${
        type === 'success'
          ? 'bg-[#1a1a2e] text-white'
          : 'bg-red-500 text-white'
      }`}
    >
      {type === 'success' ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {message}
    </div>
  )
}

function ToggleJour({ ouvert, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!ouvert)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        ouvert ? 'bg-[#1a1a2e]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          ouvert ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function TimeInput({ value, onChange }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e] transition-colors"
    />
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [resto, setResto] = useState(RESTO_DEFAUT)
  const [restoId, setRestoId] = useState(null)
  const [horaires, setHoraires] = useState(HORAIRES_DEFAUT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingBg, setUploadingBg] = useState(false)
  const [slugManuel, setSlugManuel] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })
  // Un membre invité (voir Équipe) peut consulter le dashboard opérationnel
  // mais pas modifier la Configuration — sinon un save échoue silencieusement
  // (RLS) ou, pire, crée un second restaurant s'il n'en trouve aucun à lui.
  const [estMembre, setEstMembre] = useState(false)
  const [restoNomMembre, setRestoNomMembre] = useState('')
  const [membres, setMembres] = useState([])
  const [nouvelEmailMembre, setNouvelEmailMembre] = useState('')
  const [nouveauRoleMembre, setNouveauRoleMembre] = useState('membre')
  const [ajoutMembreEnCours, setAjoutMembreEnCours] = useState(false)
  // Un manager modifie la config mais ne gère pas qui a accès — ça reste
  // le seul pouvoir réservé au vrai propriétaire.
  const [peutGererEquipe, setPeutGererEquipe] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000)
  }

  // ── Fermetures exceptionnelles ──────────────────────────────────
  const [fermetures, setFermetures] = useState([])
  const [newFermeture, setNewFermeture] = useState({ date: '', motif: '' })

  const addFermeture = async () => {
    if (!newFermeture.date || !restoId) return
    const { data, error } = await supabase
      .from('fermetures')
      .insert({ restaurant_id: restoId, date: newFermeture.date, motif: newFermeture.motif || null })
      .select('id, date, motif')
      .single()
    if (error) {
      showToast(error.message.includes('duplicate') ? 'Cette date est déjà enregistrée.' : 'Erreur : ' + error.message, 'error')
      return
    }
    setFermetures((f) => [...f, data].sort((a, b) => a.date.localeCompare(b.date)))
    setNewFermeture({ date: '', motif: '' })
    showToast('Fermeture ajoutée — le widget refusera les réservations ce jour-là.')
  }

  const removeFermeture = async (id) => {
    const { error } = await supabase.from('fermetures').delete().eq('id', id)
    if (!error) setFermetures((f) => f.filter((x) => x.id !== id))
  }

  // Charge les données existantes
  useEffect(() => {
    if (!user) return
    const load = async () => {
      // Propriétaire d'abord ; sinon on regarde si le compte est membre
      // (rôle "manager" = accès complet à la Configuration, "membre" = lecture
      // seule sur le reste du dashboard uniquement).
      let restoData = null
      let estProprietaire = false
      const { data: proprio } = await supabase
        .from('restaurants').select('*').eq('user_id', user.id).single()

      if (proprio) {
        restoData = proprio
        estProprietaire = true
      } else {
        const { data: restoIdMembre } = await supabase.rpc('mon_restaurant_id')
        if (restoIdMembre) {
          const { data: role } = await supabase.rpc('mon_role', { p_restaurant_id: restoIdMembre })
          if (role === 'manager') {
            const { data: r } = await supabase.from('restaurants').select('*').eq('id', restoIdMembre).single()
            restoData = r
          } else {
            const { data: r } = await supabase.from('restaurants').select('nom').eq('id', restoIdMembre).single()
            setEstMembre(true)
            setRestoNomMembre(r?.nom || '')
          }
        }
      }

      if (restoData) {
        setRestoId(restoData.id)
        setResto({
          nom: restoData.nom || '',
          slug: restoData.slug || '',
          adresse: restoData.adresse || '',
          telephone: restoData.telephone || '',
          description: restoData.description || '',
          nb_tables: restoData.nb_tables || '',
          nb_couverts_max: restoData.nb_couverts_max || '',
          nb_couverts_max_manuel: restoData.nb_couverts_max_manuel ?? true,
          delai_minimum_heures: restoData.delai_minimum_heures ?? 2,
          duree_occupation_minutes: restoData.duree_occupation_minutes ?? 90,
          message_confirmation: restoData.message_confirmation || '',
          widget_primary_color: restoData.widget_primary_color || '#1a1a2e',
          widget_bg_color: restoData.widget_bg_color || '#ffffff',
          widget_button_text: restoData.widget_button_text || 'Confirmer la réservation',
          widget_bg_image_url: restoData.widget_bg_image_url || '',
        })
        if (restoData.slug) setSlugManuel(true)

        // Charge les fermetures exceptionnelles à venir
        const { data: fermeturesData } = await supabase
          .from('fermetures')
          .select('id, date, motif')
          .eq('restaurant_id', restoData.id)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date')
        setFermetures(fermeturesData || [])

        // Charge les horaires
        const { data: horairesData } = await supabase
          .from('horaires')
          .select('*')
          .eq('restaurant_id', restoData.id)

        if (horairesData && horairesData.length > 0) {
          // Fusionne avec les jours par défaut pour garantir tous les 7 jours
          const merged = JOURS.map((jour) => {
            const found = horairesData.find((h) => h.jour === jour)
            return found
              ? {
                  jour,
                  ouvert: found.ouvert,
                  midi_debut: found.midi_debut?.slice(0, 5) || '12:00',
                  midi_fin: found.midi_fin?.slice(0, 5) || '14:30',
                  soir_debut: found.soir_debut?.slice(0, 5) || '19:00',
                  soir_fin: found.soir_fin?.slice(0, 5) || '22:30',
                }
              : HORAIRES_DEFAUT.find((h) => h.jour === jour)
          })
          setHoraires(merged)
        }

        setPeutGererEquipe(estProprietaire)
        // Membres avec accès (visible et gérable par le propriétaire uniquement —
        // un manager peut modifier la config, pas donner l'accès à d'autres).
        if (estProprietaire) {
          const { data: membresData } = await supabase.rpc('lister_membres', { p_restaurant_id: restoData.id })
          setMembres(membresData || [])
        }
      }
      setLoading(false)
    }
    load()
  }, [user])

  const ajouterMembre = async (e) => {
    e.preventDefault()
    if (!nouvelEmailMembre.trim() || !restoId) return
    setAjoutMembreEnCours(true)
    const { error } = await supabase.rpc('ajouter_membre_par_email', {
      p_restaurant_id: restoId, p_email: nouvelEmailMembre.trim(), p_role: nouveauRoleMembre,
    })
    setAjoutMembreEnCours(false)
    if (error) {
      const msg = error.message.includes('utilisateur_introuvable')
        ? 'Aucun compte Cerydra avec cet email. Créez-lui un compte (Supabase → Authentication) avant de l\'ajouter ici.'
        : 'Erreur : ' + error.message
      showToast(msg, 'error')
      return
    }
    const { data: membresData } = await supabase.rpc('lister_membres', { p_restaurant_id: restoId })
    setMembres(membresData || [])
    setNouvelEmailMembre('')
    showToast('Accès accordé.')
  }

  const retirerMembre = async (userId) => {
    // Passe par une RPC : supprime aussi les notifications push du membre pour
    // ce restaurant, que la RLS ne laisserait pas le propriétaire toucher
    // directement (chacun ne gère que ses propres abonnements).
    const { error } = await supabase.rpc('retirer_membre', { p_restaurant_id: restoId, p_user_id: userId })
    if (!error) setMembres((m) => m.filter((x) => x.user_id !== userId))
  }

  // Génère le slug automatiquement depuis le nom
  const handleNomChange = (val) => {
    setResto((r) => ({
      ...r,
      nom: val,
      slug: slugManuel ? r.slug : generateSlug(val),
    }))
  }

  const handleSlugChange = (val) => {
    setSlugManuel(true)
    setResto((r) => ({ ...r, slug: val.toLowerCase().replace(/[^a-z0-9-]/g, '') }))
  }

  const handleHoraire = (jour, field, value) => {
    setHoraires((h) => h.map((row) => (row.jour === jour ? { ...row, [field]: value } : row)))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!resto.nom.trim()) return showToast('Le nom du restaurant est obligatoire.', 'error')
    if (!resto.slug.trim()) return showToast('Le slug est obligatoire.', 'error')

    setSaving(true)
    try {
      let currentRestoId = restoId

      // Upsert restaurant
      if (restoId) {
        // Jamais de user_id ici : un manager (non-propriétaire) qui sauvegarde
        // ne doit modifier que les réglages, pas transférer la propriété du
        // restaurant vers son propre compte.
        const { error } = await supabase
          .from('restaurants')
          .update({ ...resto })
          .eq('id', restoId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('restaurants')
          .insert({ ...resto, user_id: user.id })
          .select()
          .single()
        if (error) throw error
        currentRestoId = data.id
        setRestoId(data.id)
      }

      // Upsert horaires : supprime et réinsère
      await supabase.from('horaires').delete().eq('restaurant_id', currentRestoId)
      const { error: hError } = await supabase.from('horaires').insert(
        horaires.map((h) => ({ ...h, restaurant_id: currentRestoId }))
      )
      if (hError) throw hError

      showToast('Configuration sauvegardée !')
    } catch (err) {
      console.error(err)
      if (err.code === '23505') {
        showToast('Ce slug est déjà utilisé par un autre restaurant.', 'error')
      } else {
        showToast('Erreur lors de la sauvegarde : ' + err.message, 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (estMembre) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
          <p className="text-gray-500 text-sm">
            Vous avez accès à <strong>{restoNomMembre}</strong> en tant que membre de l'équipe.
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Seul le propriétaire du compte peut modifier la Configuration. Les onglets Réservations,
            Plan de salle et Statistiques restent accessibles.
          </p>
        </div>
      </div>
    )
  }

  const pagePublique = resto.slug ? `cerydra.fr/resto/${resto.slug}` : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#1a1a2e]">
              {resto.nom || 'Mon restaurant'}
            </h1>
            {pagePublique && (
              <p className="text-xs text-gray-400 mt-1">
                Page publique :{' '}
                <span className="text-[#2563EB] font-medium">{pagePublique}</span>
              </p>
            )}
          </div>
          <button
            form="config-form"
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a4e] transition-colors disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        <form id="config-form" onSubmit={handleSave} className="space-y-6">

          {/* — Informations générales — */}
          <SectionCard title="Informations générales" description="Ces informations apparaissent sur votre page publique de réservation.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <Field label="Nom du restaurant">
                  <input
                    className={inputCls}
                    value={resto.nom}
                    onChange={(e) => handleNomChange(e.target.value)}
                    placeholder="Le Comptoir du Marché"
                  />
                </Field>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <Field label="URL de réservation" hint="(slug — généré automatiquement)">
                  <div className="flex items-center rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-[#1a1a2e]/10 focus-within:border-[#1a1a2e] transition-colors overflow-hidden">
                    <span className="px-3.5 py-2.5 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap select-none">
                      cerydra.fr/resto/
                    </span>
                    <input
                      className="flex-1 px-3.5 py-2.5 text-sm text-[#333] focus:outline-none bg-white"
                      value={resto.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="le-comptoir-du-marche"
                    />
                  </div>
                </Field>
              </div>

              <Field label="Adresse">
                <input
                  className={inputCls}
                  value={resto.adresse}
                  onChange={(e) => setResto({ ...resto, adresse: e.target.value })}
                  placeholder="12 rue de la Paix, 75001 Paris"
                />
              </Field>

              <Field label="Téléphone">
                <input
                  className={inputCls}
                  value={resto.telephone}
                  onChange={(e) => setResto({ ...resto, telephone: e.target.value })}
                  placeholder="01 23 45 67 89"
                />
              </Field>

              <div className="col-span-1 sm:col-span-2">
                <Field label="Description courte">
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={3}
                    value={resto.description}
                    onChange={(e) => setResto({ ...resto, description: e.target.value })}
                    placeholder="Cuisine traditionnelle française dans un cadre chaleureux..."
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          {/* — Capacité & règles — */}
          <SectionCard title="Capacité & règles" description="Paramètres utilisés pour valider les réservations.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Nombre de tables">
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  value={resto.nb_tables}
                  onChange={(e) => setResto({ ...resto, nb_tables: e.target.value })}
                  placeholder="10"
                />
              </Field>

              <Field label="Personnes max / réservation en ligne">
                <input
                  type="number"
                  min="1"
                  disabled={!resto.nb_couverts_max_manuel}
                  className={`${inputCls} ${!resto.nb_couverts_max_manuel ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                  value={resto.nb_couverts_max}
                  onChange={(e) => setResto({ ...resto, nb_couverts_max: e.target.value })}
                  placeholder="6"
                />
                <label className="flex items-center gap-2 mt-2 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!resto.nb_couverts_max_manuel}
                    onChange={async (e) => {
                      const auto = e.target.checked
                      if (auto && restoId) {
                        // Recalcul immédiat : sinon la valeur reste celle
                        // d'avant jusqu'au prochain changement de table.
                        const { data } = await supabase
                          .from('plan_tables').select('capacity').eq('restaurant_id', restoId)
                        const total = (data || []).reduce((s, t) => s + (t.capacity || 0), 0)
                        setResto((r) => ({ ...r, nb_couverts_max_manuel: false, nb_couverts_max: Math.max(total, 1) }))
                      } else {
                        setResto((r) => ({ ...r, nb_couverts_max_manuel: !auto }))
                      }
                    }}
                  />
                  Calculer automatiquement depuis mon plan de salle
                </label>
              </Field>

              <Field label="Délai minimum">
                <select
                  className={selectCls}
                  value={resto.delai_minimum_heures}
                  onChange={(e) => setResto({ ...resto, delai_minimum_heures: Number(e.target.value) })}
                >
                  {[1, 2, 3, 6, 12, 24, 48].map((h) => (
                    <option key={h} value={h}>
                      {h < 24 ? `${h}h à l'avance` : `${h / 24}j à l'avance`}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Durée d'occupation d'une table">
                <select
                  className={selectCls}
                  value={resto.duree_occupation_minutes}
                  onChange={(e) => setResto({ ...resto, duree_occupation_minutes: Number(e.target.value) })}
                >
                  {[60, 90, 120, 150].map((m) => (
                    <option key={m} value={m}>
                      {m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h${m % 60}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1.5">
                  Sert à calculer les créneaux complets : une table réservée à 20h reste indisponible pendant cette durée.
                </p>
              </Field>
            </div>
          </SectionCard>

          {/* — Fermetures exceptionnelles — */}
          <SectionCard
            title="Fermetures exceptionnelles"
            description="Congés, jours fériés… Le widget refusera les réservations à ces dates."
          >
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="date"
                className={inputCls + ' sm:max-w-[180px]'}
                min={new Date().toISOString().split('T')[0]}
                value={newFermeture.date}
                onChange={(e) => setNewFermeture({ ...newFermeture, date: e.target.value })}
              />
              <input
                type="text"
                className={inputCls}
                placeholder="Motif (facultatif) — ex : congés annuels"
                value={newFermeture.motif}
                onChange={(e) => setNewFermeture({ ...newFermeture, motif: e.target.value })}
              />
              <button
                type="button"
                onClick={addFermeture}
                disabled={!newFermeture.date}
                className="px-5 py-2.5 rounded-xl bg-[#1a1a2e] text-white text-sm font-medium hover:bg-[#2a2a4e] transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                Ajouter
              </button>
            </div>
            {fermetures.length === 0 ? (
              <p className="text-xs text-gray-400">Aucune fermeture prévue.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {fermetures.map((f) => (
                  <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                    <div className="text-sm">
                      <span className="font-medium text-[#1a1a2e]">
                        {new Date(f.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </span>
                      {f.motif && <span className="text-gray-400 ml-2">— {f.motif}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFermeture(f.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* — Message de confirmation — */}
          <SectionCard title="Message de confirmation" description="Envoyé au client après sa réservation.">
            <Field label="Message">
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                value={resto.message_confirmation}
                onChange={(e) => setResto({ ...resto, message_confirmation: e.target.value })}
                placeholder="Merci pour votre réservation ! Nous avons hâte de vous accueillir."
              />
            </Field>
          </SectionCard>

          {/* — Horaires — */}
          <SectionCard title="Horaires d'ouverture" description="Les créneaux disponibles seront proposés toutes les 30 minutes.">

            {/* ── MOBILE : cartes ─────────────────────────────────── */}
            <div className="flex flex-col gap-3 md:hidden">
              {horaires.map((h) => (
                <div key={h.jour} className={`rounded-xl border p-4 ${h.ouvert ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50'}`}>
                  {/* Ligne jour + toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-sm font-semibold capitalize ${h.ouvert ? 'text-[#1a1a2e]' : 'text-gray-300'}`}>
                      {h.jour}
                    </span>
                    <ToggleJour ouvert={h.ouvert} onChange={(val) => handleHoraire(h.jour, 'ouvert', val)} />
                  </div>
                  {h.ouvert ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Midi début</p>
                        <TimeInput value={h.midi_debut} onChange={(val) => handleHoraire(h.jour, 'midi_debut', val)} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Midi fin</p>
                        <TimeInput value={h.midi_fin} onChange={(val) => handleHoraire(h.jour, 'midi_fin', val)} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Soir début</p>
                        <TimeInput value={h.soir_debut} onChange={(val) => handleHoraire(h.jour, 'soir_debut', val)} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Soir fin</p>
                        <TimeInput value={h.soir_fin} onChange={(val) => handleHoraire(h.jour, 'soir_fin', val)} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-300">Fermé ce jour</p>
                  )}
                </div>
              ))}
            </div>

            {/* ── DESKTOP : tableau ───────────────────────────────── */}
            <div className="hidden md:block space-y-1">
              <div className="grid items-center gap-3 pb-2 border-b border-gray-50 mb-3"
                style={{ gridTemplateColumns: '90px 52px 1fr 1fr 1fr 1fr' }}>
                <span className="text-xs text-gray-400 font-medium">Jour</span>
                <span className="text-xs text-gray-400 font-medium text-center">Ouvert</span>
                <span className="text-xs text-gray-400 font-medium text-center">Midi début</span>
                <span className="text-xs text-gray-400 font-medium text-center">Midi fin</span>
                <span className="text-xs text-gray-400 font-medium text-center">Soir début</span>
                <span className="text-xs text-gray-400 font-medium text-center">Soir fin</span>
              </div>
              {horaires.map((h) => (
                <div
                  key={h.jour}
                  className={`grid items-center gap-3 py-2.5 px-3 rounded-xl transition-colors ${h.ouvert ? 'bg-white' : 'bg-gray-50'}`}
                  style={{ gridTemplateColumns: '90px 52px 1fr 1fr 1fr 1fr' }}
                >
                  <span className={`text-sm font-medium capitalize ${h.ouvert ? 'text-[#1a1a2e]' : 'text-gray-300'}`}>
                    {h.jour}
                  </span>
                  <div className="flex justify-center">
                    <ToggleJour ouvert={h.ouvert} onChange={(val) => handleHoraire(h.jour, 'ouvert', val)} />
                  </div>
                  {h.ouvert ? (
                    <>
                      <TimeInput value={h.midi_debut} onChange={(val) => handleHoraire(h.jour, 'midi_debut', val)} />
                      <TimeInput value={h.midi_fin} onChange={(val) => handleHoraire(h.jour, 'midi_fin', val)} />
                      <TimeInput value={h.soir_debut} onChange={(val) => handleHoraire(h.jour, 'soir_debut', val)} />
                      <TimeInput value={h.soir_fin} onChange={(val) => handleHoraire(h.jour, 'soir_fin', val)} />
                    </>
                  ) : (
                    <div className="col-span-4 text-xs text-gray-300 text-center">Fermé</div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Personnalisation du widget */}
          <SectionCard
            title="Personnalisation du widget"
            description="Personnalisez l'apparence de votre page de réservation publique."
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Contrôles */}
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#1a1a2e] mb-2">Couleur principale</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={resto.widget_primary_color || '#1a1a2e'}
                        onChange={(e) => setResto((r) => ({ ...r, widget_primary_color: e.target.value }))}
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={resto.widget_primary_color || '#1a1a2e'}
                        onChange={(e) => setResto((r) => ({ ...r, widget_primary_color: e.target.value }))}
                        className={inputCls + ' font-mono text-xs'}
                        placeholder="#1a1a2e"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#1a1a2e] mb-2">Couleur de fond</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={resto.widget_bg_color || '#ffffff'}
                        onChange={(e) => setResto((r) => ({ ...r, widget_bg_color: e.target.value }))}
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={resto.widget_bg_color || '#ffffff'}
                        onChange={(e) => setResto((r) => ({ ...r, widget_bg_color: e.target.value }))}
                        className={inputCls + ' font-mono text-xs'}
                        placeholder="#ffffff"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>

                <Field label="Texte du bouton de confirmation">
                  <input
                    type="text"
                    value={resto.widget_button_text || ''}
                    onChange={(e) => setResto((r) => ({ ...r, widget_button_text: e.target.value }))}
                    className={inputCls}
                    placeholder="Confirmer la réservation"
                  />
                </Field>

                <div>
                  <label className="block text-xs font-medium text-[#1a1a2e] mb-2">Photo de fond (optionnel)</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-[#1a1a2e] hover:text-[#1a1a2e] transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {uploadingBg ? 'Envoi...' : 'Choisir une photo'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingBg}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingBg(true)
                          const ext = file.name.split('.').pop()
                          const path = `widget-bg/${restoId || 'tmp'}-${Date.now()}.${ext}`
                          const { error: upErr } = await supabase.storage.from('widget-images').upload(path, file, { upsert: true })
                          if (!upErr) {
                            const { data } = supabase.storage.from('widget-images').getPublicUrl(path)
                            setResto((r) => ({ ...r, widget_bg_image_url: data.publicUrl }))
                          }
                          setUploadingBg(false)
                        }}
                      />
                    </label>
                    {resto.widget_bg_image_url && (
                      <div className="flex items-center gap-2">
                        <img src={resto.widget_bg_image_url} alt="Aperçu" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => setResto((r) => ({ ...r, widget_bg_image_url: '' }))}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Image d'arrière-plan affichée derrière le formulaire</p>
                </div>
              </div>

              {/* Aperçu live */}
              <div>
                <label className="block text-xs font-medium text-[#1a1a2e] mb-2">Aperçu</label>
                <div
                  className="rounded-2xl overflow-hidden border border-gray-200 relative"
                  style={{
                    backgroundColor: resto.widget_bg_color || '#ffffff',
                    backgroundImage: resto.widget_bg_image_url ? `url('${resto.widget_bg_image_url}')` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    minHeight: '240px',
                  }}
                >
                  {resto.widget_bg_image_url && (
                    <div className="absolute inset-0 bg-black/30 rounded-2xl" />
                  )}
                  <div className="relative z-10 p-5">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <p className="text-xs font-semibold text-[#1a1a2e] mb-3">{resto.nom || 'Votre restaurant'}</p>
                      <div className="space-y-2 mb-3">
                        <div className="h-7 bg-gray-100 rounded-lg" />
                        <div className="h-7 bg-gray-100 rounded-lg" />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="h-7 bg-gray-100 rounded-lg" />
                          <div className="h-7 bg-gray-100 rounded-lg" />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="w-full py-2 rounded-lg text-xs font-medium text-white transition-colors"
                        style={{ backgroundColor: resto.widget_primary_color || '#1a1a2e' }}
                      >
                        {resto.widget_button_text || 'Confirmer la réservation'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Bouton bas de page */}
          <div className="flex justify-end pb-8">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a4e] transition-colors disabled:opacity-50"
            >
              {saving ? 'Sauvegarde en cours...' : 'Sauvegarder la configuration'}
            </button>
          </div>
        </form>

        {/* Équipe — hors du formulaire de config : indépendant du bouton Sauvegarder.
            Réservé au propriétaire : un manager peut modifier la config, pas
            décider qui a accès. */}
        {restoId && peutGererEquipe && (
          <div className="mt-6">
            <SectionCard title="Équipe" description="Donnez accès au dashboard à un collègue (ex : pour faire une démo), sans partager votre mot de passe.">
              <div className="space-y-3">
                {membres.length === 0 ? (
                  <p className="text-xs text-gray-400">Personne d'autre n'a accès pour l'instant.</p>
                ) : (
                  <div className="space-y-2">
                    {membres.map((m) => (
                      <div key={m.user_id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[#1a1a2e]">{m.email}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            m.role === 'manager' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {m.role === 'manager' ? 'Manager' : 'Lecture seule'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => retirerMembre(m.user_id)}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={ajouterMembre} className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="email@exemple.fr"
                      value={nouvelEmailMembre}
                      onChange={(e) => setNouvelEmailMembre(e.target.value)}
                      className={inputCls}
                    />
                    <button
                      type="submit"
                      disabled={ajoutMembreEnCours}
                      className="px-4 py-2.5 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a4e] transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {ajoutMembreEnCours ? 'Ajout…' : 'Ajouter'}
                    </button>
                  </div>
                  <div className="flex gap-4">
                    {[['membre', 'Lecture seule — voit le dashboard, pas la Configuration'], ['manager', 'Manager — accès complet, y compris Configuration']].map(([v, label]) => (
                      <label key={v} className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                        <input
                          type="radio"
                          name="role-membre"
                          checked={nouveauRoleMembre === v}
                          onChange={() => setNouveauRoleMembre(v)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </form>
                <p className="text-[11px] text-gray-400">
                  La personne doit déjà avoir un compte Cerydra (créé depuis Supabase → Authentication) —
                  cela ne crée pas de compte, ça donne juste accès à celui qui existe.
                </p>
              </div>
            </SectionCard>
          </div>
        )}
      </div>

      <Toast message={toast.message} type={toast.type} />
    </div>
  )
}
