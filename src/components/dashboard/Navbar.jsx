import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Logo from '../Logo'

const navItems = [
  { to: '/dashboard/configuration', label: 'Configuration' },
  { to: '/dashboard/statistiques', label: 'Statistiques' },
  { to: '/dashboard/reservations', label: 'Réservations' },
  { to: '/dashboard/plan', label: 'Plan de salle' },
]

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
      {/* Ligne principale */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link to="/"><Logo size="sm" /></Link>

        {/* Desktop : nav + email + logout */}
        <div className="hidden sm:flex items-center gap-8 flex-1">
          <div className="flex">
            {navItems.map((item) => {
              const active = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-1 py-4 text-sm font-medium border-b-2 mr-6 transition-colors ${
                    active
                      ? 'border-[#1a1a2e] text-[#1a1a2e]'
                      : 'border-transparent text-gray-400 hover:text-[#1a1a2e]'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
          <div className="ml-auto flex items-center gap-4">
            <a
              href="/guide-utilisation.pdf"
              target="_blank"
              rel="noopener"
              className="text-xs text-gray-400 hover:text-[#1a1a2e] transition-colors"
            >
              Aide
            </a>
            <span className="text-xs text-gray-400 hidden lg:block">{user?.email}</span>
            {user?.email === 'contact@cerydra.fr' && (
              <Link
                to="/admin"
                className={`text-xs font-medium transition-colors ${
                  location.pathname === '/admin'
                    ? 'text-[#1a1a2e]'
                    : 'text-gray-400 hover:text-[#1a1a2e]'
                }`}
              >
                Admin
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-400 hover:text-[#1a1a2e] transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {/* Mobile : logout icon uniquement */}
        <button
          onClick={handleSignOut}
          className="sm:hidden p-2 text-gray-400 hover:text-[#1a1a2e] transition-colors"
          aria-label="Déconnexion"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {/* Mobile : onglets défilables */}
      <div className="sm:hidden flex border-t border-gray-50 overflow-x-auto scrollbar-none">
        {navItems.map((item) => {
          const active = location.pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? 'border-[#1a1a2e] text-[#1a1a2e]'
                  : 'border-transparent text-gray-400'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
        <a
          href="/guide-utilisation.pdf"
          target="_blank"
          rel="noopener"
          className="flex-shrink-0 px-5 py-3 text-sm font-medium border-b-2 border-transparent text-gray-400 whitespace-nowrap"
        >
          Aide
        </a>
      </div>
    </nav>
  )
}
