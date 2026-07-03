import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Logo from '../components/Logo'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function Annuler() {
  const { token } = useParams()
  // confirm : demande la confirmation avant d'annuler — indispensable car les
  // scanners d'emails (Outlook, antivirus) pré-visitent les liens et
  // annuleraient la réservation automatiquement.
  const [status, setStatus] = useState('confirm') // confirm | loading | success | already | error
  const [data, setData] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Lien invalide.') }
  }, [token])

  const confirmerAnnulation = () => {
    setStatus('loading')
    supabase.rpc('annuler_reservation', { p_token: token })
      .then(({ data: res, error }) => {
        if (error) {
          setStatus('error')
          setMessage('Ce lien d\'annulation est invalide ou a expiré.')
          return
        }
        if (res.success) {
          setStatus('success')
          setData(res)
        } else {
          setStatus('already')
          setMessage(res.error)
        }
      })
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-center">
        <Link to="/"><Logo size="sm" /></Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full text-center">

          {/* Confirmation avant annulation */}
          {status === 'confirm' && (
            <>
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Annuler votre réservation ?</h1>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Cette action est définitive. Confirmez pour libérer votre table.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={confirmerAnnulation}
                  className="px-6 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Oui, annuler ma réservation
                </button>
                <Link
                  to="/"
                  className="px-6 py-3 border border-gray-200 text-[#1a1a2e] rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
                >
                  Non, je garde ma table
                </Link>
              </div>
            </>
          )}

          {/* Chargement */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Annulation en cours...</p>
            </div>
          )}

          {/* Succès */}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Réservation annulée</h1>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Votre réservation a bien été annulée. Nous espérons vous accueillir prochainement.
              </p>

              {data && (
                <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-3 mb-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Nom</span>
                    <span className="font-medium text-[#1a1a2e]">{data.prenom} {data.nom}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Date</span>
                    <span className="font-medium text-[#1a1a2e]">{formatDate(data.date)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Heure</span>
                    <span className="font-medium text-[#1a1a2e]">{data.heure?.slice(0, 5)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Statut</span>
                    <span className="text-red-500 font-medium">Annulée</span>
                  </div>
                </div>
              )}

              <Link
                to="/"
                className="inline-block px-6 py-3 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a4e] transition-colors"
              >
                Retour à l'accueil
              </Link>
            </>
          )}

          {/* Déjà annulée */}
          {status === 'already' && (
            <>
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Déjà annulée</h1>
              <p className="text-gray-500 text-sm mb-8">{message}</p>
              <Link
                to="/"
                className="inline-block px-6 py-3 border border-gray-200 text-[#1a1a2e] rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
              >
                Retour à l'accueil
              </Link>
            </>
          )}

          {/* Erreur */}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Lien invalide</h1>
              <p className="text-gray-500 text-sm mb-8">
                {message || 'Ce lien d\'annulation est invalide ou a expiré.'}
              </p>
              <Link
                to="/"
                className="inline-block px-6 py-3 border border-gray-200 text-[#1a1a2e] rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
              >
                Retour à l'accueil
              </Link>
            </>
          )}

        </div>
      </div>

      <footer className="border-t border-gray-100 py-6 text-center">
        <p className="text-xs text-gray-300">
          Propulsé par <span className="text-gray-400 font-medium">CERYDRA</span>
        </p>
      </footer>
    </div>
  )
}
