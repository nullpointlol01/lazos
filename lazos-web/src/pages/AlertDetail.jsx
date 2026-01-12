import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, ArrowLeft, AlertTriangle, Clock, Navigation } from 'lucide-react'
import ReportModal from '@/components/ReportModal'

import { API_URL } from '@/config/api'

// Animal type labels and emojis
const animalEmojis = {
  dog: '🐕',
  cat: '🐈',
  other: '🐾',
}

const animalLabels = {
  dog: 'Perro',
  cat: 'Gato',
  other: 'Otro',
}

// Format relative time
function formatTimeAgo(dateString) {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) return 'hace un momento'
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
  }
  const days = Math.floor(diffInSeconds / 86400)
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`
}

export default function AlertDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [alert, setAlert] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)

  useEffect(() => {
    const fetchAlertDetail = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`${API_URL}/api/v1/alerts/${id}`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Aviso no encontrado')
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        setAlert(data)
      } catch (err) {
        console.error('Error fetching alert detail:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAlertDetail()
  }, [id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="bg-muted h-8 rounded mb-4"></div>
            <div className="bg-muted h-32 rounded mb-4"></div>
            <div className="bg-muted h-24 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} className="mr-2" />
            Volver
          </Button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-medium mb-2">{error}</p>
            <Button onClick={() => navigate('/avisos')} className="mt-4">
              Ver todos los avisos
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!alert) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-2xl mx-auto">
        {/* Header con botón volver y reportar */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} className="mr-2" />
            Volver
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReportModal(true)}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          >
            <AlertTriangle size={18} className="mr-2" />
            Reportar
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-6">
            {/* Animal type header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="text-5xl">
                {animalEmojis[alert.animal_type] || '🐾'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {animalLabels[alert.animal_type]} avistado
                </h1>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Clock size={14} />
                  <span>{formatTimeAgo(alert.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                Descripción
              </h2>
              <p className="text-card-foreground text-base leading-relaxed whitespace-pre-wrap">
                {alert.description}
              </p>
            </div>

            {/* Dirección (si existe) */}
            {alert.direction && (
              <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Navigation size={18} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">
                      Dirección del movimiento
                    </p>
                    <p className="text-sm text-primary">
                      {alert.direction}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Ubicación */}
            {alert.location_name && (
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin size={18} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Ubicación
                    </p>
                    <p className="text-sm text-card-foreground">{alert.location_name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Info adicional */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-xs text-yellow-800">
                  <span className="font-medium">Aviso rápido:</span> Este es un reporte rápido de avistamiento.
                  Si tienes información adicional, considera crear una publicación completa con fotos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Modal */}
        <ReportModal
          alertId={id}
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
      </div>
    </div>
  )
}
