import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAlerts } from '@/hooks/useAlerts'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Clock, Megaphone, RefreshCw, ArrowRight } from 'lucide-react'

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

// Animal type emoji mapping
const animalEmojis = {
  dog: '🐕',
  cat: '🐈',
  other: '🐾',
}

// Animal type labels
const animalLabels = {
  dog: 'Perro',
  cat: 'Gato',
  other: 'Otro',
}

export default function Alerts() {
  const navigate = useNavigate()
  const { alerts, loading, error, refetch } = useAlerts()

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const { isPulling, pullProgress } = usePullToRefresh(handleRefresh)

  // Auto-refresh every 5 minutes
  const { timeAgo, setLastUpdate } = useAutoRefresh(() => {
    refetch()
  }, 5 * 60 * 1000)

  // Update last update timestamp when alerts change
  useEffect(() => {
    if (!loading && alerts.length > 0) {
      setLastUpdate(Date.now())
    }
  }, [alerts, loading, setLastUpdate])

  if (loading && alerts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted h-32 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
          <p className="text-destructive font-medium mb-2">Error al cargar avisos</p>
          <p className="text-sm text-destructive/80">{error}</p>
        </div>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <>
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Avisos Rápidos</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Reportes rápidos de avistamientos
            </p>
          </div>
          <div className="bg-muted/50 border border-border rounded-lg p-8 text-center">
            <Megaphone size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-foreground text-lg mb-2">No hay avisos aún</p>
            <p className="text-sm text-muted-foreground">
              Sé el primero en reportar un avistamiento rápido
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/avisos/nuevo')}
          size="icon"
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40"
        >
          <Megaphone size={28} />
        </Button>
      </>
    )
  }

  return (
    <>
      {/* Pull-to-refresh indicator */}
      {isPulling && (
        <div
          className="fixed top-14 left-0 right-0 flex justify-center z-50 transition-opacity"
          style={{ opacity: pullProgress / 100 }}
        >
          <div className="bg-background rounded-full shadow-lg p-2 border border-border">
            <RefreshCw
              size={20}
              className={`text-primary ${pullProgress >= 100 ? 'animate-spin' : ''}`}
            />
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        {/* Título */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-foreground">Avisos Rápidos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {alerts.length} {alerts.length === 1 ? 'aviso' : 'avisos'}
          </p>
        </div>

        {/* Last update indicator */}
        {!loading && alerts.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground text-center">
              Última actualización: {timeAgo}
            </p>
          </div>
        )}

        {/* Lista de avisos */}
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className="hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => navigate(`/avisos/${alert.id}`)}
            >
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl flex-shrink-0">
                    {animalEmojis[alert.animal_type] || '🐾'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">
                        {animalLabels[alert.animal_type] || 'Animal'}
                      </span>
                      {alert.direction && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                          <ArrowRight size={12} />
                          {alert.direction}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-2">
                      {alert.description}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-xs text-muted-foreground pt-3 border-t border-border space-y-1">
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    <span className="truncate">
                      {alert.location_name || 'Sin ubicación'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>
                      {formatTimeAgo(alert.created_at)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAB */}
      <Button
        onClick={() => navigate('/avisos/nuevo')}
        size="icon"
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40"
      >
        <Megaphone size={28} />
      </Button>
    </>
  )
}
