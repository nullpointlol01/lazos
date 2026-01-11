import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, MapPin, Calendar, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { API_URL } from '@/config/api'

// Animal type labels
const animalLabels = {
  dog: 'Perro',
  cat: 'Gato',
  other: 'Otro',
}

const sizeLabels = {
  small: 'Chico',
  medium: 'Mediano',
  large: 'Grande',
}

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function Search() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [activeTab, setActiveTab] = useState(searchParams.get('type') || 'all')
  const [results, setResults] = useState({ posts: [], alerts: [], total_posts: 0, total_alerts: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  const debouncedQuery = useDebounce(query, 300)

  // Perform search
  const performSearch = useCallback(async (searchQuery, type) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults({ posts: [], alerts: [], total_posts: 0, total_alerts: 0 })
      setHasSearched(false)
      return
    }

    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: type
      })

      const response = await fetch(`${API_URL}/api/v1/search?${params}`)

      if (!response.ok) {
        throw new Error('Error al realizar la búsqueda')
      }

      const data = await response.json()
      setResults(data)

      // Update URL params
      setSearchParams({ q: searchQuery, type })
    } catch (err) {
      console.error('Search error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [setSearchParams])

  // Effect for debounced search
  useEffect(() => {
    performSearch(debouncedQuery, activeTab)
  }, [debouncedQuery, activeTab, performSearch])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
  }

  const handleClearSearch = () => {
    setQuery('')
    setResults({ posts: [], alerts: [], total_posts: 0, total_alerts: 0 })
    setHasSearched(false)
    setSearchParams({})
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const highlightText = (text, query) => {
    if (!text || !query) return text

    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ?
        <strong key={index} className="bg-primary/20 dark:bg-primary/30 text-foreground font-semibold">{part}</strong> :
        part
    )
  }

  const totalResults = results.total_posts + results.total_alerts
  const showPosts = activeTab === 'all' || activeTab === 'posts'
  const showAlerts = activeTab === 'all' || activeTab === 'alerts'

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">Búsqueda</h2>
          <p className="text-sm text-muted-foreground">
            Busca mascotas por descripción, ubicación o tipo de animal
          </p>
        </div>

        {/* Search input */}
        <div className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: perro grande negro, zona centro, etc."
              className="w-full pl-10 pr-10 py-3 border border-input bg-card text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring text-base transition-colors"
              autoFocus
            />
            {query && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
          {query.length > 0 && query.length < 2 && (
            <p className="text-xs text-muted-foreground mt-2">Escribe al menos 2 caracteres para buscar</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border bg-card">
          <button
            onClick={() => handleTabChange('all')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos {hasSearched && `(${totalResults})`}
          </button>
          <button
            onClick={() => handleTabChange('posts')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'posts'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Posts {hasSearched && `(${results.total_posts})`}
          </button>
          <button
            onClick={() => handleTabChange('alerts')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'alerts'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Avisos {hasSearched && `(${results.total_alerts})`}
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Buscando...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* Empty state - no search yet */}
        {!hasSearched && !loading && (
          <div className="text-center py-12">
            <SearchIcon className="mx-auto text-muted-foreground/30 mb-4" size={64} />
            <p className="text-foreground text-lg mb-2">Comienza a buscar</p>
            <p className="text-sm text-muted-foreground">
              Escribe en el campo de búsqueda para encontrar mascotas
            </p>
          </div>
        )}

        {/* No results */}
        {hasSearched && !loading && totalResults === 0 && (
          <div className="text-center py-12">
            <SearchIcon className="mx-auto text-muted-foreground/30 mb-4" size={64} />
            <p className="text-foreground text-lg mb-2">No se encontraron resultados</p>
            <p className="text-sm text-muted-foreground">
              Intenta con otros términos de búsqueda
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && hasSearched && totalResults > 0 && (
          <div className="space-y-6">
            {/* Posts */}
            {showPosts && results.posts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Publicaciones ({results.total_posts})
                </h3>
                <div className="space-y-3">
                  {results.posts.map((post) => (
                    <Card
                      key={post.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/post/${post.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <img
                            src={post.thumbnail_url}
                            alt="Post"
                            className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                            onError={(e) => {
                              e.target.src = 'https://placehold.co/80x80/e5e7eb/6b7280?text=Sin+imagen'
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-foreground">
                                {animalLabels[post.animal_type]} - {sizeLabels[post.size]}
                              </span>
                            </div>
                            {post.description && (
                              <p className="text-sm text-card-foreground line-clamp-2 mb-2">
                                {highlightText(post.description, query)}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {post.location_name && (
                                <div className="flex items-center gap-1">
                                  <MapPin size={12} />
                                  <span className="truncate max-w-[150px]">
                                    {highlightText(post.location_name, query)}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>{formatDate(post.sighting_date)}</span>
                              </div>
                              {post.distance_km !== null && post.distance_km !== undefined && (
                                <span className="text-primary font-medium">
                                  a {post.distance_km} km
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Alerts */}
            {showAlerts && results.alerts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Avisos Rápidos ({results.total_alerts})
                </h3>
                <div className="space-y-3">
                  {results.alerts.map((alert) => (
                    <Card
                      key={alert.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/avisos/${alert.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <div className="text-2xl flex-shrink-0">
                            {alert.animal_type === 'dog' ? '🐕' : alert.animal_type === 'cat' ? '🐈' : '🐾'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-foreground">
                                {animalLabels[alert.animal_type]}
                              </span>
                              {alert.direction && (
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                  {alert.direction}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-card-foreground line-clamp-2 mb-2">
                              {highlightText(alert.description, query)}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {alert.location_name && (
                                <div className="flex items-center gap-1">
                                  <MapPin size={12} />
                                  <span className="truncate max-w-[150px]">
                                    {highlightText(alert.location_name, query)}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>{formatDate(alert.created_at)}</span>
                              </div>
                              {alert.distance_km !== null && alert.distance_km !== undefined && (
                                <span className="text-primary font-medium">
                                  a {alert.distance_km} km
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
