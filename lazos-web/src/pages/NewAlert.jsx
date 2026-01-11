import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { MapPin, Loader2, X } from 'lucide-react'
import { validateText, sanitizeText } from '@/utils/validateText'
import { API_URL, NOMINATIM_API_URL } from '@/config/api'

export default function NewAlert() {
  const navigate = useNavigate()

  // Form state
  const [formData, setFormData] = useState({
    animalType: 'dog',
    description: '',
    direction: '',
  })

  // Location state
  const [location, setLocation] = useState(null) // { latitude, longitude, name }
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [locationMode, setLocationMode] = useState(null) // 'gps' | 'manual'
  const [manualAddress, setManualAddress] = useState({
    street: '',
    number: '',
    city: '',
    state: 'Buenos Aires', // Default to Buenos Aires
  })
  const [citySuggestions, setCitySuggestions] = useState([])
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const [citySearchTerm, setCitySearchTerm] = useState('')
  const [loadingCities, setLoadingCities] = useState(false)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Provincias state (cargado desde JSON)
  const [provincias, setProvincias] = useState([])
  const [loadingProvincias, setLoadingProvincias] = useState(true)

  // Cargar provincias desde JSON al montar el componente
  useEffect(() => {
    fetch('/data/provincias.json')
      .then(res => res.json())
      .then(data => {
        const provs = (data.provincias || []).sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es')
        )
        setProvincias(provs)
        const buenosAires = provs.find(p => p.nombre === 'Buenos Aires')
        if (buenosAires && !manualAddress.state) {
          setManualAddress(prev => ({ ...prev, state: buenosAires.nombre }))
        }
        setLoadingProvincias(false)
      })
      .catch(err => {
        console.error('[Provincias] Error cargando JSON:', err)
        setLoadingProvincias(false)
      })
  }, [])

  // Load cities for the selected province from local Georef data
  useEffect(() => {
    const { state } = manualAddress

    if (!state) {
      setCitySuggestions([])
      return
    }

    setLoadingCities(true)

    // Cargar localidades desde JSON local completo de Argentina
    fetch('/data/localidades.json')
      .then(res => res.json())
      .then(data => {
        let localidades = []

        // Soportar dos estructuras:
        // 1. Agrupado por provincia: { "Buenos Aires": [...], "Córdoba": [...] }
        // 2. Array plano: { "localidades": [...] } donde cada item tiene "provincia"

        if (data[state]) {
          // Estructura agrupada por provincia
          localidades = data[state]
        } else if (data.localidades) {
          // Estructura plana, filtrar por provincia
          localidades = data.localidades.filter(loc =>
            loc.provincia && loc.provincia.nombre === state
          )
        }

        // Ordenar alfabéticamente
        localidades.sort((a, b) => a.nombre.localeCompare(b.nombre))

        console.log(`[Localidades] Cargadas ${localidades.length} localidades de ${state} (ordenadas alfabéticamente)`)
        setCitySuggestions(localidades)
        setLoadingCities(false)
      })
      .catch(err => {
        console.error('[Localidades] Error cargando JSON local:', err)
        console.error('[Localidades] Intentar con API Georef como fallback')
        setCitySuggestions([])
        setLoadingCities(false)
      })
  }, [manualAddress.state])

  // Filter cities based on search term
  const filteredCities = citySearchTerm.length === 0
    ? citySuggestions.slice(0, 20) // Show first 20 when no search
    : citySuggestions
        .filter(city =>
          city.nombre.toLowerCase().includes(citySearchTerm.toLowerCase())
        )
        .slice(0, 20) // Max 20 results

  // Get user location (same as NewPost)
  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización')
      setLocationMode('manual')
      return
    }

    setLoadingLocation(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        // Reverse geocoding with Nominatim
        try {
          const response = await fetch(
            `${NOMINATIM_API_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'es-AR,es',
              },
            }
          )

          const data = await response.json()
          const address = data.address || {}
          const parts = []

          if (address.road) parts.push(address.road)
          if (address.neighbourhood || address.suburb) {
            parts.push(address.neighbourhood || address.suburb)
          }
          if (address.city || address.town) {
            parts.push(address.city || address.town)
          }

          const locationName = parts.join(', ') || data.display_name

          setLocation({
            latitude,
            longitude,
            name: locationName,
          })
          setLocationMode('gps')
        } catch (err) {
          console.error('Error reverse geocoding:', err)
          setLocation({
            latitude,
            longitude,
            name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          })
          setLocationMode('gps')
        }

        setLoadingLocation(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        setLoadingLocation(false)
        setLocationMode('manual')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  // Geocode manual address
  const geocodeManualAddress = async () => {
    const { street, number, city, state } = manualAddress

    // Validate all required fields
    if (!street || !number || !city || !state) {
      setError('Debes completar todos los campos: Calle, Altura, Localidad y Provincia')
      return
    }

    setLoadingLocation(true)
    setError(null)

    try {
      // Build complete address query for precise geocoding
      const query = `${street} ${number}, ${city}, ${state}, Argentina`
      console.log('[Geocode] Query:', query)

      const response = await fetch(
        `${NOMINATIM_API_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'es-AR,es',
          },
        }
      )

      console.log('[Geocode] Response status:', response.status)

      if (!response.ok) {
        console.error('[Geocode] HTTP Error:', response.status)
        setError(`Error de conexión (${response.status}). Intentá de nuevo.`)
        return
      }

      const data = await response.json()
      console.log('[Geocode] Resultados:', data.length)

      if (data && data.length > 0) {
        const result = data[0]
        const locationName = `${street} ${number}, ${city}, ${state}`

        setLocation({
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          name: locationName,
        })
        setLocationMode('manual')
      } else {
        setError(
          'No se pudo encontrar la dirección exacta. Verifica que la calle, altura y localidad sean correctos.'
        )
      }
    } catch (err) {
      console.error('Error geocoding address:', err)
      setError('Error al buscar la dirección')
    } finally {
      setLoadingLocation(false)
    }
  }

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.description || formData.description.trim().length < 10) {
      setError('La descripción debe tener al menos 10 caracteres')
      return
    }

    // Validar contenido del texto
    const textValidation = validateText(formData.description)
    if (!textValidation.valid) {
      setError(textValidation.errors.join('. '))
      return
    }

    if (!location) {
      setError('Debes obtener tu ubicación')
      return
    }

    console.log('📤 [FRONTEND] Creando aviso...')

    setLoading(true)

    try {
      const sanitizedDescription = sanitizeText(formData.description)

      const alertData = {
        description: sanitizedDescription,
        animal_type: formData.animalType,
        direction: formData.direction || null,
        latitude: location.latitude,
        longitude: location.longitude,
        location_name: location.name || null,
      }

      console.log('📦 [FRONTEND] Datos del aviso:', alertData)

      const response = await fetch(`${API_URL}/api/v1/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertData),
      })

      console.log('📥 [FRONTEND] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ [FRONTEND] Error response:', errorData)
        throw new Error(errorData.detail || 'Error al crear el aviso')
      }

      const result = await response.json()
      console.log('✅ [FRONTEND] Aviso creado exitosamente:', result.id)

      // Redirect to alerts page
      navigate('/avisos')
    } catch (err) {
      console.error('❌ [FRONTEND] Error creating alert:', err)
      setError(err.message || 'Error al crear el aviso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Nuevo Aviso Rápido</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Reporta un avistamiento de manera rápida (sin foto)
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Description */}
        <div>
          <Label htmlFor="description" className="text-base">
            Descripción <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => {
              const value = e.target.value.slice(0, 1000)
              setFormData({ ...formData, description: value })
            }}
            placeholder="Ej: Vi un perrito marrón con collar rojo corriendo por la plaza..."
            rows={4}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formData.description.length}/1000 caracteres
          </p>
        </div>

        {/* Animal Type */}
        <div>
          <Label className="text-base">Tipo de animal</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { value: 'dog', label: '🐕 Perro' },
              { value: 'cat', label: '🐈 Gato' },
              { value: 'other', label: 'Otro' },
            ].map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={formData.animalType === option.value ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, animalType: option.value })}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Direction */}
        <div>
          <Label htmlFor="direction" className="text-base">
            Dirección/Rumbo (opcional)
          </Label>
          <Input
            id="direction"
            value={formData.direction}
            onChange={(e) => setFormData({ ...formData, direction: e.target.value.slice(0, 200) })}
            placeholder="Ej: hacia el sur, entrando al parque, por la avenida..."
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Hacia dónde iba el animal (si lo recuerdas)
          </p>
        </div>

        {/* Location - Same component as NewPost */}
        <div>
          <Label className="text-base">
            Ubicación <span className="text-red-500">*</span>
          </Label>
          <div className="mt-2 space-y-3">
            {!locationMode && !location && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={getLocation}
                  disabled={loadingLocation}
                >
                  {loadingLocation ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Obteniendo ubicación...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Usar mi ubicación actual
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setLocationMode('manual')}
                >
                  Ingresar dirección manualmente
                </Button>
              </div>
            )}

            {locationMode === 'manual' && !location && (
              <div className="space-y-3 p-4 bg-muted rounded-lg border">
                <p className="text-sm text-muted-foreground">Ingresa la dirección del avistamiento</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="street" className="text-sm">Calle *</Label>
                    <Input
                      id="street"
                      value={manualAddress.street}
                      onChange={(e) => setManualAddress({ ...manualAddress, street: e.target.value })}
                      placeholder="Av. Santa Fe"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="number" className="text-sm">Altura aproximada *</Label>
                    <Input
                      id="number"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={manualAddress.number}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '')
                        setManualAddress({ ...manualAddress, number: value })
                      }}
                      placeholder="1234"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="city" className="text-sm">Localidad *</Label>
                    <div className="relative mt-1">
                      <button
                        type="button"
                        onClick={() => setShowCitySuggestions(!showCitySuggestions)}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className={manualAddress.city ? 'text-foreground' : 'text-muted-foreground'}>
                          {manualAddress.city || 'Seleccionar localidad...'}
                        </span>
                        <svg
                          className="h-4 w-4 opacity-50"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showCitySuggestions && (
                        <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg">
                          {/* Search input inside dropdown */}
                          <div className="p-2 border-b">
                            <Input
                              placeholder="Buscar localidad..."
                              value={citySearchTerm}
                              onChange={(e) => setCitySearchTerm(e.target.value)}
                              autoFocus
                              className="h-8"
                            />
                          </div>

                          {/* Cities list */}
                          <div className="max-h-60 overflow-y-auto">
                            {loadingCities ? (
                              <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                                Cargando localidades...
                              </div>
                            ) : filteredCities.length > 0 ? (
                              filteredCities.map((city, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  className={`w-full text-left px-3 py-2 hover:bg-accent text-sm ${
                                    manualAddress.city === city.nombre ? 'bg-primary/10 font-medium' : ''
                                  }`}
                                  onClick={() => {
                                    setManualAddress({ ...manualAddress, city: city.nombre })
                                    setCitySearchTerm('')
                                    setShowCitySuggestions(false)
                                  }}
                                >
                                  {city.nombre}
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                                {citySearchTerm ? 'No se encontraron localidades' : 'No hay localidades disponibles'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Click outside to close */}
                      {showCitySuggestions && (
                        <div
                          className="fixed inset-0 z-0"
                          onClick={() => {
                            setShowCitySuggestions(false)
                            setCitySearchTerm('')
                          }}
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {manualAddress.city ? (
                        <span className="text-green-600">✓ Seleccionado: {manualAddress.city}</span>
                      ) : (
                        'Click para abrir el desplegable'
                      )}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="state" className="text-sm">Provincia *</Label>
                    <Select
                      id="state"
                      value={manualAddress.state}
                      onChange={(e) => setManualAddress({ ...manualAddress, state: e.target.value })}
                      className="mt-1"
                    >
                      {loadingProvincias ? (
                        <option>Cargando provincias...</option>
                      ) : (
                        <>
                          <option value="">Seleccionar provincia</option>
                          {provincias.map((prov) => (
                            <option key={prov.id} value={prov.nombre}>
                              {prov.nombre}
                            </option>
                          ))}
                        </>
                      )}
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setLocationMode(null)
                      setManualAddress({ street: '', number: '', city: '', state: 'Buenos Aires' })
                      setCitySearchTerm('')
                      setShowCitySuggestions(false)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={geocodeManualAddress}
                    disabled={
                      loadingLocation ||
                      !manualAddress.street ||
                      !manualAddress.number ||
                      !manualAddress.city ||
                      !manualAddress.state
                    }
                  >
                    {loadingLocation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      'Confirmar ubicación'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {location && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-900">
                    Ubicación obtenida
                  </p>
                  <p className="text-sm text-green-700 break-words">
                    {location.name}
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs text-green-600"
                    onClick={() => {
                      setLocation(null)
                      setLocationMode(null)
                      setManualAddress({ street: '', number: '', city: '', state: 'Buenos Aires' })
                      setCitySearchTerm('')
                      setShowCitySuggestions(false)
                    }}
                  >
                    Cambiar ubicación
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/avisos')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publicando...
              </>
            ) : (
              'Publicar Aviso'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
