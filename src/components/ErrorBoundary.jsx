import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center">
            <div className="text-4xl mb-4">😕</div>
            <h1 className="text-xl font-bold text-[#1a1a2e] mb-2">Une erreur est survenue</h1>
            <p className="text-gray-500 text-sm mb-6">
              Rechargez la page. Si le problème persiste, contactez-nous à{' '}
              <a href="mailto:contact@cerydra.fr" className="text-[#1a1a2e] underline">contact@cerydra.fr</a>.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a4e] transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
