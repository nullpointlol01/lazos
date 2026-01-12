import { Link } from 'react-router-dom'
import { Sun, Moon, HelpCircle } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useState } from 'react'
import BottomNav from './BottomNav'
import HelpModal from '@/components/HelpModal'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

export default function Layout({ children }) {
  const { theme, toggleTheme } = useTheme()
  const [showHelpModal, setShowHelpModal] = useState(false)

  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-card border-b border-border z-40 transition-colors duration-200">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo y subtítulo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/logo40x40.png" alt="lazos logo" className="w-8 h-8" />
            <div className="flex items-center gap-2">
              <h1 className="text-2xl" style={{ fontFamily: 'Pacifico, cursive', color: '#7DB5A0' }}>
                lazos
              </h1>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-muted-foreground text-sm">Red de avistamientos</span>
            </div>
          </Link>

          {/* Botones: Ayuda y Tema */}
          <div className="flex items-center gap-2">
            {/* Help Button */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-2 rounded-lg opacity-60 hover:opacity-100 transition-all duration-200 hover:bg-muted"
              aria-label="Ayuda"
            >
              <HelpCircle size={20} className="text-foreground" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg opacity-60 hover:opacity-100 transition-all duration-200 hover:bg-muted"
              aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            >
              {theme === 'light' ? (
                <Moon size={20} className="text-foreground" />
              ) : (
                <Sun size={20} className="text-foreground" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Help Modal */}
      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />

      {/* Main content - con padding para header y bottom nav */}
      <main className="pt-14 pb-16 min-h-screen">
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  )
}
