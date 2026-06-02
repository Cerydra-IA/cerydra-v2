import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Logo from '../components/Logo'

export default function Connexion() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset password
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(form.email, form.password)
    setLoading(false)
    if (err) {
      setError('Email ou mot de passe incorrect.')
    } else {
      navigate('/dashboard')
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setResetError('')
    setResetLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/connexion`,
    })
    setResetLoading(false)
    if (err) {
      setResetError('Une erreur est survenue. Vérifiez l\'adresse email.')
    } else {
      setResetSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/"><Logo size="lg" /></Link>
          <p className="text-gray-500 text-sm mt-3">Accédez à votre espace restaurateur</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="contact@monrestaurant.fr"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Mot de passe</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Votre mot de passe"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e] transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#1a1a2e] text-white rounded-xl font-medium text-sm hover:bg-[#2a2a4e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        {/* Mot de passe oublié */}
        <div className="mt-4">
          {!showReset ? (
            <button
              onClick={() => setShowReset(true)}
              className="w-full text-center text-sm text-gray-400 hover:text-[#1a1a2e] transition-colors"
            >
              Mot de passe oublié ?
            </button>
          ) : resetSent ? (
            <div className="bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-xl text-center">
              Un lien de réinitialisation a été envoyé à <strong>{resetEmail}</strong>. Vérifiez votre boîte mail.
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-3 pt-2 border-t border-gray-100">
              <p className="text-sm text-gray-500 text-center pt-2">
                Entrez votre email pour recevoir un lien de réinitialisation.
              </p>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                placeholder="contact@monrestaurant.fr"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e] transition-colors"
              />
              {resetError && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {resetError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowReset(false); setResetEmail(''); setResetError('') }}
                  className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-500 rounded-xl text-sm hover:border-gray-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2.5 px-4 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a4e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="text-[#2563EB] font-medium hover:underline">
            Créer un compte gratuit
          </Link>
        </p>
      </div>
    </div>
  )
}
