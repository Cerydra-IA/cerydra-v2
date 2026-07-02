import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Accueil from './pages/Accueil'
import Inscription from './pages/Inscription'
import Connexion from './pages/Connexion'
import Dashboard from './pages/Dashboard'
import Reservations from './pages/Reservations'
import Statistiques from './pages/Statistiques'
import PlanDeSalle from './pages/PlanDeSalle'
import RestoPublic from './pages/RestoPublic'
import Annuler from './pages/Annuler'
import Admin from './pages/Admin'
import ResetPassword from './pages/ResetPassword'
import './index.css'

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/dashboard" element={<Navigate to="/dashboard/reservations" replace />} />
          <Route
            path="/dashboard/configuration"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/statistiques"
            element={
              <ProtectedRoute>
                <Statistiques />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/reservations"
            element={
              <ProtectedRoute>
                <Reservations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/plan"
            element={
              <ProtectedRoute>
                <PlanDeSalle />
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<Admin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/resto/:slug" element={<RestoPublic />} />
          <Route path="/annuler/:token" element={<Annuler />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
