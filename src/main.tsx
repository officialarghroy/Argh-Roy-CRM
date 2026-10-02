import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { ErrorBoundary } from '@/components/ErrorBoundary'

registerSW({
  immediate: true,
  // Check as soon as the app opens so an installed PWA does not continue using
  // an older bundle after a deployment. In auto-update mode, activating the
  // new worker reloads the app once with a complete, matching set of assets.
  onRegisteredSW: (_swUrl, registration) => {
    if (!registration) return

    const checkForUpdate = () => {
      void registration.update().catch((error) => {
        console.warn('[PWA] Unable to check for an update:', error)
      })
    }

    checkForUpdate()
    window.setInterval(checkForUpdate, 60 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
