import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

export default function Inscription() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="mb-8">
          <Link to="/"><Logo size="lg" /></Link>
        </div>

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
          L'accès à CERYDRA se fait sur invitation. Pour rejoindre la plateforme,
          contactez-nous à{' '}
          <span className="font-medium text-[#1a1a2e]">contact@cerydra.fr</span>
        </p>

        <a
          href="mailto:contact@cerydra.fr?subject=Demande d'accès CERYDRA"
          className="block w-full py-3 px-4 bg-[#1a1a2e] text-white rounded-xl font-medium text-sm hover:bg-[#2a2a4e] transition-colors mb-4"
        >
          Contacter pour obtenir un accès
        </a>

        <p className="text-sm text-gray-400">
          Déjà un compte ?{' '}
          <Link to="/connexion" className="text-[#2563EB] font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
