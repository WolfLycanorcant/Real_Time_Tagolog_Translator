import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { GlobalErrorBoundary } from './utils/error-handling/GlobalErrorBoundary.tsx'
import { initializeTunnelGuard } from './utils/error-handling/DevTunnelGuard.ts'

// Initialize tunnel guard and error handling
async function initializeApp() {
  try {
    console.log('🚀 Initializing Tagalog Translator...')
    
    // Run tunnel compatibility checks
    const tunnelReady = await initializeTunnelGuard()
    
    if (tunnelReady) {
      console.log('✅ Error handling framework initialized')
    } else {
      console.warn('⚠️ Some compatibility issues detected, but continuing...')
    }
    
    // Render the app
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      </React.StrictMode>,
    )
    
  } catch (error) {
    console.error('Failed to initialize app:', error)
    
    // Fallback rendering
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Initialization Failed
          </h1>
          <p className="text-gray-600 mb-6">
            The application failed to initialize. Please refresh the page or check your connection.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }
}

// Initialize the app
initializeApp()