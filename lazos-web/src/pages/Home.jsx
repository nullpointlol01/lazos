import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PostCard from '@/components/posts/PostCard'
import FAB from '@/components/common/FAB'
import FilterBar from '@/components/FilterBar'
import { usePosts } from '@/hooks/usePosts'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { API_URL } from '@/config/api'
import { RefreshCw } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({})
  const { posts, loading, error, meta, availableFilters, refetch } = usePosts(filters)

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const { isPulling, pullProgress } = usePullToRefresh(handleRefresh)

  // Auto-refresh every 5 minutes
  const { timeAgo, setLastUpdate } = useAutoRefresh(() => {
    refetch()
  }, 5 * 60 * 1000)

  // Update last update timestamp when posts change
  useEffect(() => {
    if (!loading && posts.length > 0) {
      setLastUpdate(Date.now())
    }
  }, [posts, loading, setLastUpdate])

  const handlePostClick = (post) => {
    console.log('Post clicked:', post.id)
  }

  const handleNewPost = () => {
    navigate('/new')
  }

  if (loading && posts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted aspect-square rounded-lg mb-2"></div>
              <div className="bg-muted h-4 rounded mb-2"></div>
              <div className="bg-muted h-3 rounded w-2/3"></div>
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
          <p className="text-destructive font-medium mb-2">Error al cargar publicaciones</p>
          <p className="text-sm text-destructive/80">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Verifica que la API esté corriendo en {API_URL}
          </p>
        </div>
      </div>
    )
  }

  const hasActiveFilters = Object.keys(filters).length > 0

  if (posts.length === 0 && !loading) {
    return (
      <>
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          availableFilters={availableFilters}
          totalResults={meta?.total || 0}
        />
        <div className="container mx-auto px-4 py-6">
          <div className="bg-muted/50 border border-border rounded-lg p-8 text-center">
            {hasActiveFilters ? (
              <>
                <p className="text-foreground text-lg mb-2">No se encontraron publicaciones</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Intenta ajustar los filtros para ver más resultados
                </p>
                <button
                  onClick={() => setFilters({})}
                  className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                >
                  Limpiar todos los filtros
                </button>
              </>
            ) : (
              <>
                <p className="text-foreground text-lg mb-2">No hay publicaciones aún</p>
                <p className="text-sm text-muted-foreground">
                  Sé el primero en reportar un avistamiento
                </p>
              </>
            )}
          </div>
        </div>
        <FAB onClick={handleNewPost} />
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

      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        availableFilters={availableFilters}
        totalResults={meta?.total || 0}
      />

      {/* Last update indicator */}
      {!loading && posts.length > 0 && (
        <div className="container mx-auto px-4 pt-2">
          <p className="text-xs text-muted-foreground text-center">
            Última actualización: {timeAgo}
          </p>
        </div>
      )}

      <div className="container mx-auto px-4 py-4">
        {/* Grilla de posts */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onClick={handlePostClick}
            />
          ))}
        </div>
      </div>

      {/* Botón flotante */}
      <FAB onClick={handleNewPost} />
    </>
  )
}
