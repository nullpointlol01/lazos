import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'

const REPORT_REASONS = [
  { value: 'not_animal', label: 'No es un animal' },
  { value: 'inappropriate', label: 'Contenido inapropiado' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Otro' }
]

export default function ReportModal({ postId, alertId, isOpen, onClose }) {
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  import { API_URL } from '@/config/api'
  const itemType = postId ? 'publicación' : 'aviso'

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!reason) {
      setError('Debes seleccionar una razón')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/v1/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_id: postId || undefined,
          alert_id: alertId || undefined,
          reason: reason,
          description: description || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Error al enviar el reporte')
      }

      setSubmitted(true)

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose()
        // Reset state
        setTimeout(() => {
          setReason('')
          setDescription('')
          setSubmitted(false)
        }, 300)
      }, 2000)

    } catch (err) {
      console.error('Error reporting post:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
      // Reset state after animation
      setTimeout(() => {
        setReason('')
        setDescription('')
        setSubmitted(false)
        setError(null)
      }, 300)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-orange-500" size={20} />
            <h2 className="text-lg font-semibold text-foreground">Reportar {itemType}</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {submitted ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                ¡Gracias por reportar!
              </h3>
              <p className="text-sm text-muted-foreground">
                Tu reporte ha sido enviado a nuestro equipo de moderación.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Reason selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Razón del reporte *
                </label>
                <div className="space-y-2">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        reason === r.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-accent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={(e) => setReason(e.target.value)}
                        className="mr-3"
                      />
                      <span className="text-sm text-foreground">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Proporciona más detalles si es necesario..."
                  className="w-full px-3 py-2 border border-border rounded-md focus:ring-primary focus:border-primary text-sm bg-background text-foreground placeholder:text-muted-foreground"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {description.length}/1000 caracteres
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !reason}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-md text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enviando...' : 'Enviar reporte'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
