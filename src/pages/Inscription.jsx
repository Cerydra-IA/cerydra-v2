import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e] transition-colors'

export default function Inscription() {
  const [showForm, setShowForm] = useState(false)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ restaurant: '', nom: '', email: '', telephone: '' })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'form-name': 'demande-acces', ...form }).toString(),
    })
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full">

        <div className="text-center mb-8">
          <Link to="/"><Logo size="lg" /></Link>
        </div>

        {/* État initial */}
        {!showForm && !sent && (
          <div className="text-center">
            <div className="w-14 h-14 bg-[#1a1a2e]/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-7 h-7 text-[#1a1a2e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-[#1a1a2e] mb-3">
              Accès sur invitation uniquement
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              L'accès à CERYDRA se fait sur invitation. Pour rejoindre la plateforme, faites une demande d'accès ci-dessous.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 px-4 bg-[#1a1a2e] text-white rounded-xl font-medium text-sm hover:bg-[#2a2a4e] transition-colors"
            >
              Demander un accès
            </button>
          </div>
        )}

        {/* Formulaire */}
        {showForm && !sent && (
          <>
            <h1 className="text-lg font-semibold text-[#1a1a2e] mb-1">Demande d'accès</h1>
            <p className="text-gray-400 text-sm mb-6">On vous recontacte sous 24h.</p>

            {/* Form déclaré pour Netlify (détecté au build) */}
            <form
              name="demande-acces"
              netlify="true"
              data-netlify="true"
              hidden
            >
              <input type="text" name="restaurant" />
              <input type="text" name="nom" />
              <input type="email" name="email" />
              <input type="tel" name="telephone" />
            </form>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">Nom du restaurant *</label>
                <input
                  name="restaurant" value={form.restaurant} onChange={handleChange}
                  required placeholder="Le Petit Bistrot"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">Prénom / Nom du gérant *</label>
                <input
                  name="nom" value={form.nom} onChange={handleChange}
                  required placeholder="Jean Dupont"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">Email *</label>
                <input
                  name="email" type="email" value={form.email} onChange={handleChange}
                  required placeholder="contact@monrestaurant.fr"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">Téléphone</label>
                <input
                  name="telephone" value={form.telephone} onChange={handleChange}
                  placeholder="06 12 34 56 78"
                  className={inputCls}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 px-4 border border-gray-200 text-gray-500 rounded-xl text-sm hover:border-gray-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-[#1a1a2e] text-white rounded-xl font-medium text-sm hover:bg-[#2a2a4e] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Confirmation */}
        {sent && (
          <div className="text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">Demande envoyée !</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Merci <strong>{form.nom.split(' ')[0]}</strong>. On revient vers vous sous 24h à l'adresse{' '}
              <strong>{form.email}</strong>.
            </p>
          </div>
        )}

        <p className="text-center text-sm text-gray-400 mt-8">
          Déjà un compte ?{' '}
          <Link to="/connexion" className="text-[#2563EB] font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
