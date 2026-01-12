import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Locate, Filter, X } from 'lucide-react'

import { API_URL } from '@/config/api'

// Fix Leaflet default icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom icons for posts and alerts
const createIcon = (color) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-marker',
    iconSize: [25, 25],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  })
}

const postIcon = createIcon('#ff6b35') // Orange
const alertIcon = createIcon('#ffd93d') // Yellow

const animalLabels = {
  dog: 'Perro',
  cat: 'Gato',
  other: 'Otro',
}

// Component to fit map bounds to all markers
function FitBounds({ posts, alerts }) {
  const map = useMap()

  useEffect(() => {
    if (posts.length > 0 || alerts.length > 0) {
      const allPoints = [
        ...posts.map(p => [p.lat, p.lon]),
        ...alerts.map(a => [a.lat, a.lon])
      ]

      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints)
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
  }, [posts, alerts, map])

  return null
}

// Component to handle map location
function LocationButton({ onLocate }) {
  const map = useMap()

  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          map.setView([latitude, longitude], 15)
          onLocate && onLocate({ lat: latitude, lng: longitude })
        },
        (error) => {
          console.error('Error getting location:', error)
          alert('No se pudo obtener tu ubicación')
        }
      )
    } else {
      alert('Geolocalización no soportada por tu navegador')
    }
  }

  return null // The button is rendered outside the map
}

export default function Map() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    animal_type: '',
  })
  const [mapRef, setMapRef] = useState(null)

  // Default center: Buenos Aires
  const defaultCenter = [-34.6037, -58.3816]
  const defaultZoom = 12

  useEffect(() => {
    fetchMapPoints()
  }, [filters])

  const fetchMapPoints = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filters.animal_type) {
        params.append('animal_type', filters.animal_type)
      }

      const response = await fetch(`${API_URL}/api/v1/map/points/unified?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar puntos del mapa')
      }

      const data = await response.json()
      setPosts(data.posts || [])
      setAlerts(data.alerts || [])
    } catch (err) {
      console.error('Error fetching map points:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          if (mapRef) {
            mapRef.setView([latitude, longitude], 15)
          }
        },
        (error) => {
          console.error('Error getting location:', error)
          alert('No se pudo obtener tu ubicación')
        }
      )
    } else {
      alert('Geolocalización no soportada por tu navegador')
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const clearFilters = () => {
    setFilters({
      animal_type: '',
    })
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== '')

  return (
    <div className="relative h-[calc(100dvh-3.5rem-4rem)]">
      {/* Map Container */}
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        ref={setMapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-fit bounds to show all markers */}
        <FitBounds posts={posts} alerts={alerts} />

        {/* Post Markers */}
          {posts.map((post) => (
            <Marker
              key={`post-${post.id}`}
              position={[post.lat, post.lon]}
              icon={postIcon}
            >
              <Popup>
                <div className="max-w-[200px]">
                  <div
                    className="cursor-pointer mb-2"
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    <div className="flex gap-2 mb-2">
                      <img
                        src={post.thumbnail_url}
                        alt="Post"
                        className="w-16 h-16 object-cover rounded"
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/64x64/e5e7eb/6b7280?text=Sin+imagen'
                        }}
                      />
                      <div>
                        <p className="font-semibold text-sm">
                          {animalLabels[post.animal_type]}
                        </p>
                        <p className="text-xs text-muted-foreground">Post</p>
                      </div>
                    </div>
                    <p className="text-xs text-primary hover:underline">
                      Ver detalles →
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Alert Markers */}
          {alerts.map((alert) => (
            <Marker
              key={`alert-${alert.id}`}
              position={[alert.lat, alert.lon]}
              icon={alertIcon}
            >
              <Popup>
                <div className="max-w-[200px]">
                  <div
                    className="cursor-pointer mb-2"
                    onClick={() => navigate(`/avisos/${alert.id}`)}
                  >
                    <div className="mb-2">
                      <p className="font-semibold text-sm">
                        {animalLabels[alert.animal_type]}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">Aviso rápido</p>
                      <p className="text-xs text-foreground line-clamp-2">
                        {alert.description}
                      </p>
                    </div>
                    <p className="text-xs text-primary hover:underline">
                      Ver detalles →
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card rounded-lg shadow-lg px-4 py-2 z-[1000]">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-card-foreground">Cargando mapa...</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 rounded-lg shadow-lg px-4 py-2 z-[1000] max-w-sm">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Locate button */}
        <button
          onClick={handleLocate}
          className="bg-card rounded-lg shadow-lg p-3 hover:bg-secondary/80 transition-colors"
          title="Mi ubicación"
        >
          <Locate size={20} className="text-card-foreground" />
        </button>

        {/* Filter button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`bg-card rounded-lg shadow-lg p-3 hover:bg-secondary/80 transition-colors relative ${
            hasActiveFilters ? 'ring-2 ring-primary' : ''
          }`}
          title="Filtros"
        >
          <Filter size={20} className="text-card-foreground" />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
              1
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="absolute top-4 left-4 bg-card rounded-lg shadow-lg p-4 z-[1000] w-64">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Filtros</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Animal type filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Tipo de animal
            </label>
            <select
              value={filters.animal_type}
              onChange={(e) => handleFilterChange('animal_type', e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md text-sm focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
            >
              <option value="">Todos</option>
              <option value="dog">Perro</option>
              <option value="cat">Gato</option>
              <option value="other">Otro</option>
            </select>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="w-full text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card rounded-lg shadow-lg p-3 z-[1000]">
        <h4 className="text-xs font-semibold text-foreground mb-2">Leyenda</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#ff6b35] rounded-full border-2 border-card shadow"></div>
            <span className="text-xs text-card-foreground">Posts ({posts.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#ffd93d] rounded-full border-2 border-card shadow"></div>
            <span className="text-xs text-card-foreground">Avisos ({alerts.length})</span>
          </div>
        </div>
      </div>
    </div>
  )
}
