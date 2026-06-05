import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Logo from '../Logo'

const navItems = [
  { to: '/dashboard', label: 'Configuration' },
  { to: '/dashboard/statistiques', label: 'Statistiques' },
  { to: '/dashboard/reservations', label: 'Réservations' },
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
      <div className="max-w-6xl mx-auto px-6 py-0 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/"><Logo size="sm" /></Link>
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
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">{user?.email}</span>
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
    </nav>
  )
}
