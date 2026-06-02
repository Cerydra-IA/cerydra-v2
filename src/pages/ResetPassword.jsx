import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Logo from '../components/Logo'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)

  // Supabase envoie le token via le fragment #access_token=...&type=recovery
  // onAuthStateChange le détecte automatiquement et établit la session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Fallback : si la session est déjà active (rechargement de page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    // Timeout : si après 5s aucun token détecté, le lien est invalide/expiré
    const timeout = setTimeout(() => {
      setSessionReady((prev) => {
        if (!prev) setInvalidLink(true)
        return prev
      })
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError('Une erreur est survenue. Le lien est peut-être expiré.')
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 3000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/"><Logo size="lg" /></Link>
          <p className="text-gray-500 text-sm mt-3">Réinitialisation du mot de passe</p>
        </div>

        {/* Lien invalide / expiré */}
        {invalidLink && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl text-center">
              Ce lien est invalide ou a expiré. Faites une nouvelle demande.
            </div>
            <Link
              to="/connexion"
              className="block w-full py-3 px-4 bg-[#1a1a2e] text-white rounded-xl font-medium text-sm hover:bg-[#2a2a4e] transition-colors text-center"
            >
              Retour à la connexion
            </Link>
          </div>
        )}

        {/* Chargement token */}
        {!invalidLink && !sessionReady && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-6 h-6 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Vérification du lien…</p>
          </div>
        )}

        {/* Succès */}
        {sessionReady && success && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-xl text-center">
              Mot de passe mis à jour ! Vous allez être redirigé vers votre dashboard…
            </div>
          </div>
        )}

        {/* Formulaire */}
        {sessionReady && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-1.5">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Au moins 6 caractères"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-1.5">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Répétez le mot de passe"
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
              {loading ? 'Mise à jour…' : 'Définir le nouveau mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
