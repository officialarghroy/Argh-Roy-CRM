import { useEffect, useState } from 'react'
import { HiOutlineDownload, HiOutlineX, HiOutlineShare } from 'react-icons/hi'
import { Button } from '@/components/ui/Button'

const DISMISS_KEY = 'pwa-install-dismissed'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [installed, setInstalled] = useState(isStandalone)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    if (installed) return

    const onInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
      setShowIosHint(false)
    }

    window.addEventListener('beforeinstallprompt', onInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [installed])

  useEffect(() => {
    if (installed || dismissed || deferredPrompt) return
    if (isIos() && !isStandalone()) {
      const timer = window.setTimeout(() => setShowIosHint(true), 2000)
      return () => window.clearTimeout(timer)
    }
  }, [installed, dismissed, deferredPrompt])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
    setShowIosHint(false)
    setDeferredPrompt(null)
  }

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
    }
    setDeferredPrompt(null)
  }

  if (installed || dismissed) return null

  if (deferredPrompt) {
    return (
      <div
        className="fixed left-4 right-4 z-[150] mx-auto max-w-md"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
      >
        <div className="glass-card flex items-center gap-3 p-4 shadow-xl border-accent/30">
          <img src="/pwa-192.png" alt="" className="h-11 w-11 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Install Argh Roy CRM</p>
            <p className="text-xs text-muted mt-0.5">Add to your home screen for quick access.</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" onClick={install} className="min-h-[40px]">
              <HiOutlineDownload className="h-4 w-4" />
              Install
            </Button>
            <button
              type="button"
              onClick={dismiss}
              className="border-0 p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/5 min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Dismiss install prompt"
            >
              <HiOutlineX className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showIosHint) {
    return (
      <div
        className="fixed left-4 right-4 z-[150] mx-auto max-w-md"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
      >
        <div className="glass-card p-4 shadow-xl border-accent/30">
          <div className="flex items-start gap-3">
            <img src="/pwa-192.png" alt="" className="h-11 w-11 rounded-xl shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Install on iPhone</p>
              <p className="text-xs text-muted mt-1 flex items-center gap-1 flex-wrap">
                Tap <HiOutlineShare className="h-3.5 w-3.5 inline shrink-0" /> Share, then
                <span className="font-medium text-foreground">Add to Home Screen</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="border-0 p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/5 shrink-0"
              aria-label="Dismiss install hint"
            >
              <HiOutlineX className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
