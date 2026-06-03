import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Logo from '../components/Logo'

export default function Accueil() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="px-5 py-2.5 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a4e] transition-colors"
              >
                Mon dashboard
              </Link>
            ) : (
              <>
                <Link to="/connexion" className="text-sm text-gray-500 hover:text-[#1a1a2e] transition-colors">
                  Se connecter
                </Link>
                <Link
                  to="/inscription"
                  className="px-5 py-2.5 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a4e] transition-colors"
                >
                  Créer mon compte
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-[#1a1a2e]/5 text-[#1a1a2e] text-xs font-medium px-4 py-2 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full"></span>
          Système de réservation intelligent pour restaurants
        </div>

        <div className="inline-flex items-center gap-1.5 border border-[#1a1a2e]/10 text-[#1a1a2e]/60 text-xs font-medium px-3.5 py-1.5 rounded-full mb-4">
          Vos clients vous appartiennent
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-[#1a1a2e] leading-tight mb-6 tracking-tight">
          Vos réservations,
          <br />
          <span style={{ color: '#2563EB' }}>automatisées.</span>
        </h1>

        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
          CERYDRA donne à votre restaurant une page de réservation en ligne professionnelle,
          un widget intégrable sur votre site, et une gestion centralisée de vos clients.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/inscription"
            className="px-8 py-4 bg-[#1a1a2e] text-white rounded-xl font-semibold text-sm hover:bg-[#2a2a4e] transition-colors"
          >
            Créer mon compte gratuit →
          </Link>
          <a
            href="#fonctionnalites"
            className="px-8 py-4 border border-gray-200 text-[#1a1a2e] rounded-xl font-semibold text-sm hover:border-gray-300 transition-colors"
          >
            Voir les fonctionnalités
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="fonctionnalites" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#1a1a2e] text-center mb-4 tracking-tight">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-gray-500 text-center mb-12 max-w-lg mx-auto">
            Configurez votre restaurant en 5 minutes. Vos clients peuvent réserver directement en ligne.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '📅',
                title: 'Page de réservation',
                desc: 'Une page publique cerydra.fr/resto/votre-restaurant, prête à partager sur vos réseaux.',
              },
              {
                icon: '🔌',
                title: 'Widget intégrable',
                desc: 'Un simple copier-coller pour ajouter un bouton "Réserver" sur votre site existant.',
              },
              {
                icon: '⚙️',
                title: 'Dashboard complet',
                desc: 'Gérez vos horaires, vos tables, et consultez toutes vos réservations en un seul endroit.',
              },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-7 border border-gray-100">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-[#1a1a2e] mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-[#1a1a2e] mb-4 tracking-tight">
            Prêt à commencer ?
          </h2>
          <p className="text-gray-500 mb-8">
            Créez votre compte gratuitement et configurez votre restaurant en quelques minutes.
          </p>
          <Link
            to="/inscription"
            className="inline-block px-8 py-4 bg-[#1a1a2e] text-white rounded-xl font-semibold text-sm hover:bg-[#2a2a4e] transition-colors"
          >
            Commencer gratuitement →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-xs text-gray-400">© 2025 CERYDRA. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
