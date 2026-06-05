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
  delai_minimum_heures: 2,
  message_confirmation: 'Merci pour votre réservation ! Nous avons hâte de vous accueillir.',
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
  const [slugManuel, setSlugManuel] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000)
  }

  // Charge les données existantes
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data: restoData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .single()

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
          delai_minimum_heures: restoData.delai_minimum_heures ?? 2,
          message_confirmation: restoData.message_confirmation || '',
        })
        if (restoData.slug) setSlugManuel(true)

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
      }
      setLoading(false)
    }
    load()
  }, [user])

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
        const { error } = await supabase
          .from('restaurants')
          .update({ ...resto, user_id: user.id })
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

  const pagePublique = resto.slug ? `cerydra.fr/resto/${resto.slug}` : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Nom du restaurant">
                  <input
                    className={inputCls}
                    value={resto.nom}
                    onChange={(e) => handleNomChange(e.target.value)}
                    placeholder="Le Comptoir du Marché"
                  />
                </Field>
              </div>

              <div className="col-span-2">
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

              <div className="col-span-2">
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
            <div className="grid grid-cols-3 gap-4">
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

              <Field label="Couverts max / table">
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  value={resto.nb_couverts_max}
                  onChange={(e) => setResto({ ...resto, nb_couverts_max: e.target.value })}
                  placeholder="6"
                />
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
            </div>
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
            <div className="space-y-1">
              {/* Header */}
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
                  className={`grid items-center gap-3 py-2.5 px-3 rounded-xl transition-colors ${
                    h.ouvert ? 'bg-white' : 'bg-gray-50'
                  }`}
                  style={{ gridTemplateColumns: '90px 52px 1fr 1fr 1fr 1fr' }}
                >
                  <span className={`text-sm font-medium capitalize ${h.ouvert ? 'text-[#1a1a2e]' : 'text-gray-300'}`}>
                    {h.jour}
                  </span>

                  <div className="flex justify-center">
                    <ToggleJour
                      ouvert={h.ouvert}
                      onChange={(val) => handleHoraire(h.jour, 'ouvert', val)}
                    />
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

                <Field label="Photo de fond (URL, optionnel)">
                  <input
                    type="url"
                    value={resto.widget_bg_image_url || ''}
                    onChange={(e) => setResto((r) => ({ ...r, widget_bg_image_url: e.target.value }))}
                    className={inputCls}
                    placeholder="https://exemple.com/image.jpg"
                  />
                  <p className="text-xs text-gray-400 mt-1">Image d'arrière-plan affichée derrière le formulaire</p>
                </Field>
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
      </div>

      <Toast message={toast.message} type={toast.type} />
    </div>
  )
}
