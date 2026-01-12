## 6. FRONTEND

### 6.1 Estructura de Páginas

**Home (`/`):**
```jsx
// Componentes principales:
// - FilterBar (colapsable con filtros dinámicos)
// - Grilla de PostCards (responsive 2/3/4 cols)
// - Pull-to-refresh indicator
// - Auto-refresh con timestamp

const Home = () => {
  const [filters, setFilters] = useState({})
  const { posts, loading, meta, availableFilters } = usePosts(filters)
  const { isPulling } = usePullToRefresh(() => refetch())
  const { timeAgo } = useAutoRefresh(() => refetch(), 5 * 60 * 1000)

  return (
    <Layout>
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        availableFilters={availableFilters}
        totalResults={meta?.total}
      />
      {loading ? <SkeletonGrid /> : (
        posts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {posts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        ) : (
          <EmptyState hasFilters={Object.keys(filters).length > 0} />
        )
      )}
      <FAB onClick={() => navigate('/new')} />
    </Layout>
  )
}
```

**PostDetail (`/post/:id`):**
```jsx
// Componentes principales:
// - Carousel de imágenes con navegación
// - Info completa del post
// - Botón reportar
// - ReportModal

const PostDetail = () => {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showReportModal, setShowReportModal] = useState(false)

  // Carousel con navegación prev/next
  // Swipe gestures en móvil
  // Indicadores de posición (ej: 2/3)

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <ImageCarousel
          images={post.images}
          currentIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
        />
        <PostInfo post={post} />
        <button onClick={() => setShowReportModal(true)}>
          Reportar
        </button>
        <ReportModal
          postId={post.id}
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
      </div>
    </Layout>
  )
}
```

**Map (`/mapa`):**
```jsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'

const Map = () => {
  const [points, setPoints] = useState([])
  const [filters, setFilters] = useState({})
  const mapRef = useRef()

  useEffect(() => {
    const bounds = mapRef.current?.getBounds()
    if (bounds) {
      fetchPoints({
        sw_lat: bounds.getSouthWest().lat,
        sw_lng: bounds.getSouthWest().lng,
        ne_lat: bounds.getNorthEast().lat,
        ne_lng: bounds.getNorthEast().lng,
        ...filters
      })
    }
  }, [filters])

  return (
    <MapContainer center={[-34.603, -58.381]} zoom={12} ref={mapRef}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MarkerClusterGroup>
        {points.map(point => (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
            icon={customIcon(point.type)}  // naranja=post, amarillo=alert
          >
            <Popup>
              <img src={point.thumbnail_url} />
              <p>{point.location_name}</p>
              <Link to={`/${point.type}/${point.id}`}>Ver detalle</Link>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  )
}
```

**Admin (`/admin`):**
```jsx
const Admin = () => {
  const [password, setPassword] = useState(localStorage.getItem('adminPassword') || '')
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({})

  const fetchReports = async () => {
    const res = await fetch('/api/v1/admin/reports', {
      headers: { 'X-Admin-Password': password }
    })
    if (res.ok) {
      setReports(await res.json())
      localStorage.setItem('adminPassword', password)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1>Panel de Moderación</h1>
      <Stats stats={stats} />
      <ReportsList
        reports={reports}
        onResolve={handleResolve}
        onDelete={handleDelete}
      />
    </div>
  )
}
```

### 6.2 Hooks Personalizados

**usePosts.js:**
```javascript
export const usePosts = (filters = {}) => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [meta, setMeta] = useState({})
  const [availableFilters, setAvailableFilters] = useState({})

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams(filters).toString()
      const res = await fetch(`${API_URL}/api/v1/posts?${queryParams}`)
      const data = await res.json()
      setPosts(data.data)
      setMeta(data.meta)
      setAvailableFilters(data.available_filters)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return { posts, loading, error, meta, availableFilters, refetch: fetchPosts }
}
```

**usePullToRefresh.js:**
```javascript
export const usePullToRefresh = (onRefresh) => {
  const [isPulling, setIsPulling] = useState(false)
  const [pullProgress, setPullProgress] = useState(0)

  useEffect(() => {
    let startY = 0
    const threshold = 100

    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY
      }
    }

    const handleTouchMove = (e) => {
      if (window.scrollY === 0 && startY > 0) {
        const currentY = e.touches[0].clientY
        const diff = currentY - startY
        if (diff > 0) {
          setPullProgress(Math.min(diff / threshold, 1))
          setIsPulling(diff > threshold)
        }
      }
    }

    const handleTouchEnd = () => {
      if (isPulling) {
        onRefresh()
      }
      startY = 0
      setPullProgress(0)
      setIsPulling(false)
    }

    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isPulling, onRefresh])

  return { isPulling, pullProgress }
}
```

### 6.3 Componentes Clave

**FilterBar.jsx:**
```jsx
const FilterBar = ({ filters, onFiltersChange, availableFilters, totalResults }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const activeFiltersCount = Object.keys(filters).filter(k => filters[k]).length

  return (
    <div className="sticky top-0 bg-background border-b shadow-sm z-10">
      <button onClick={() => setIsExpanded(!isExpanded)}>
        <Filter className="h-4 w-4" />
        <span>Filtros</span>
        {activeFiltersCount > 0 && (
          <Badge>{activeFiltersCount}</Badge>
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Chips de filtros activos */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, value]) => (
                value && (
                  <Chip
                    key={key}
                    label={formatFilter(key, value)}
                    onRemove={() => onFiltersChange({ ...filters, [key]: null })}
                  />
                )
              ))}
            </div>
          )}

          {/* Contador de resultados */}
          <p className="text-sm text-muted-foreground">
            {totalResults} publicaciones encontradas
          </p>

          {/* Dropdowns de filtros */}
          <Select
            label="Provincia"
            value={filters.provincia}
            onChange={(val) => onFiltersChange({ ...filters, provincia: val, localidad: null })}
            options={availableFilters.provincias?.map(p => ({
              value: p.value,
              label: `${p.value} (${p.count})`
            }))}
          />

          {filters.provincia && (
            <Select
              label="Localidad"
              value={filters.localidad}
              onChange={(val) => onFiltersChange({ ...filters, localidad: val })}
              options={availableFilters.localidades
                ?.filter(l => l.provincia === filters.provincia)
                .map(l => ({
                  value: l.value,
                  label: `${l.value} (${l.count})`
                }))
              }
            />
          )}

          {/* Botones de filtro */}
          <div>
            <label>Tipo de animal</label>
            <div className="flex gap-2">
              {availableFilters.animal_types?.map(type => (
                <Button
                  key={type.value}
                  variant={filters.animal_type === type.value ? 'default' : 'outline'}
                  onClick={() => onFiltersChange({
                    ...filters,
                    animal_type: filters.animal_type === type.value ? null : type.value
                  })}
                >
                  {type.label} ({type.count})
                </Button>
              ))}
            </div>
          </div>

          {/* Presets de fecha */}
          <div>
            <label>Fecha</label>
            <div className="flex gap-2">
              <Button onClick={() => setDatePreset('today')}>Hoy</Button>
              <Button onClick={() => setDatePreset('week')}>Semana</Button>
              <Button onClick={() => setDatePreset('month')}>Mes</Button>
              <Button onClick={() => setDatePreset('all')}>Todos</Button>
            </div>
          </div>

          <Button variant="ghost" onClick={() => onFiltersChange({})}>
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  )
}
```

**ReportModal.jsx:**
```jsx
const ReportModal = ({ postId, alertId, isOpen, onClose }) => {
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await fetch('/api/v1/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          alert_id: alertId,
          reason,
          description
        })
      })
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reportar contenido</DialogTitle>
        </DialogHeader>

        {success ? (
          <div>
            <CheckCircle className="text-green-500" />
            <p>Reporte enviado correctamente</p>
          </div>
        ) : (
          <>
            <RadioGroup value={reason} onValueChange={setReason}>
              <RadioGroupItem value="not_animal" label="No es un animal" />
              <RadioGroupItem value="inappropriate" label="Contenido inapropiado" />
              <RadioGroupItem value="spam" label="Spam" />
              <RadioGroupItem value="other" label="Otro" />
            </RadioGroup>

            <Textarea
              placeholder="Descripción adicional (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
            <p className="text-xs">{description.length}/1000</p>

            <Button onClick={handleSubmit} disabled={!reason || loading}>
              {loading ? 'Enviando...' : 'Enviar reporte'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

---

