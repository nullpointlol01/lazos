import { useState, useEffect } from 'react'
import { X, Smartphone } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Check if prompt was already shown
    const promptShown = localStorage.getItem('pwa_prompt_shown')
    if (promptShown === 'true') {
      return
    }

    // Check if it's a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )

    if (!isMobile) {
      return
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)

      // Show the prompt after 3 seconds
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return
    }

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    // We've used the prompt, so clear it
    setDeferredPrompt(null)

    // Hide the banner
    setShowPrompt(false)

    // Mark as shown
    localStorage.setItem('pwa_prompt_shown', 'true')
  }

  const handleClose = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa_prompt_shown', 'true')
  }

  if (!showPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4 animate-slide-up">
      <div className="max-w-md mx-auto bg-card border border-border rounded-lg shadow-lg p-4 flex items-center gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <Smartphone size={24} className="text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground mb-1">
            Agregá LAZOS a tu pantalla de inicio
          </p>
          <p className="text-xs text-muted-foreground">
            Accedé más rápido a la app
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
          >
            Agregar
          </button>
          <button
            onClick={handleClose}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
