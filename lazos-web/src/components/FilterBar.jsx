import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'

const ANIMAL_TYPES = {
  dog: 'Perro',
  cat: 'Gato',
  other: 'Otro'
}

const SIZES = {
  small: 'Pequeño',
  medium: 'Mediano',
  large: 'Grande'
}

const SEXES = {
  male: 'Macho',
  female: 'Hembra',
  unknown: 'Desconocido'
}

const DATE_PRESETS = [
  { value: 'all', label: 'Todos' },
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' }
]

export default function FilterBar({ filters, onFiltersChange, availableFilters, totalResults }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Calculate date_from based on preset
  const getDateFromPreset = (preset) => {
    const today = new Date()
    switch (preset) {
      case 'today':
        return today.toISOString().split('T')[0]
      case 'week':
        const weekAgo = new Date(today)
        weekAgo.setDate(today.getDate() - 7)
        return weekAgo.toISOString().split('T')[0]
      case 'month':
        const monthAgo = new Date(today)
        monthAgo.setMonth(today.getMonth() - 1)
        return monthAgo.toISOString().split('T')[0]
      case 'all':
      default:
        return null
    }
  }

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters }

    if (value === null || value === '' || value === 'all') {
      delete newFilters[key]
    } else {
      newFilters[key] = value
    }

    // If changing provincia, clear localidad
    if (key === 'provincia') {
      delete newFilters.localidad
    }

    // Handle date presets
    if (key === 'date_preset') {
      const dateFrom = getDateFromPreset(value)
      if (dateFrom) {
        newFilters.date_from = dateFrom
        delete newFilters.date_to
      } else {
        delete newFilters.date_from
        delete newFilters.date_to
      }
    }

    onFiltersChange(newFilters)
  }

  const removeFilter = (key) => {
    const newFilters = { ...filters }
    delete newFilters[key]

    // Clear date preset if removing date filters
    if (key === 'date_from' || key === 'date_to') {
      delete newFilters.date_preset
    }

    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  // Count active filters (excluding date_preset which is internal)
  const activeFilterCount = Object.keys(filters).filter(k => k !== 'date_preset').length

  // Determine current date preset
  const getCurrentDatePreset = () => {
    if (!filters.date_from) return 'all'

    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString().split('T')[0]
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    const monthAgoStr = monthAgo.toISOString().split('T')[0]

    if (filters.date_from === today) return 'today'
    if (filters.date_from === weekAgoStr) return 'week'
    if (filters.date_from === monthAgoStr) return 'month'
    return 'all'
  }

  return (
    <div className="bg-card border-b border-border sticky top-0 z-10 shadow-sm transition-colors">
      {/* Header with toggle */}
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-card-foreground hover:text-foreground font-medium transition-colors"
            >
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              <span>Filtros</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{totalResults}</span> publicaciones encontradas
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {filters.provincia && (
              <FilterChip
                label={`Provincia: ${filters.provincia}`}
                onRemove={() => removeFilter('provincia')}
              />
            )}
            {filters.localidad && (
              <FilterChip
                label={`Localidad: ${filters.localidad}`}
                onRemove={() => removeFilter('localidad')}
              />
            )}
            {filters.animal_type && (
              <FilterChip
                label={ANIMAL_TYPES[filters.animal_type]}
                onRemove={() => removeFilter('animal_type')}
              />
            )}
            {filters.size && (
              <FilterChip
                label={`Tamaño: ${SIZES[filters.size]}`}
                onRemove={() => removeFilter('size')}
              />
            )}
            {filters.sex && (
              <FilterChip
                label={`Sexo: ${SEXES[filters.sex]}`}
                onRemove={() => removeFilter('sex')}
              />
            )}
            {filters.date_from && (
              <FilterChip
                label={`Desde: ${filters.date_from}`}
                onRemove={() => removeFilter('date_from')}
              />
            )}
          </div>
        )}
      </div>

      {/* Expanded filters panel */}
      {isExpanded && (
        <div className="container mx-auto px-4 pb-4 border-t border-border pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Provincia dropdown */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Provincia
              </label>
              <select
                value={filters.provincia || ''}
                onChange={(e) => handleFilterChange('provincia', e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:ring-ring focus:border-ring text-sm transition-colors"
              >
                <option value="">Todas las provincias</option>
                {availableFilters?.provincias?.map((prov) => (
                  <option key={prov.value} value={prov.value}>
                    {prov.value} ({prov.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Localidad dropdown (only show if provincia selected) */}
            {filters.provincia && availableFilters?.localidades && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Localidad
                </label>
                <select
                  value={filters.localidad || ''}
                  onChange={(e) => handleFilterChange('localidad', e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:ring-ring focus:border-ring text-sm transition-colors"
                >
                  <option value="">Todas las localidades</option>
                  {availableFilters.localidades.map((loc) => (
                    <option key={loc.value} value={loc.value}>
                      {loc.value} ({loc.count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date presets */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Fecha
              </label>
              <div className="flex gap-1">
                {DATE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleFilterChange('date_preset', preset.value)}
                    className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
                      getCurrentDatePreset() === preset.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filter chips for animal type, size, sex */}
          <div className="mt-4 space-y-3">
            {/* Animal type */}
            {availableFilters?.animal_types && availableFilters.animal_types.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tipo de animal
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableFilters.animal_types.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => handleFilterChange('animal_type', type.value)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                        filters.animal_type === type.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {ANIMAL_TYPES[type.value]} ({type.count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size */}
            {availableFilters?.sizes && availableFilters.sizes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tamaño
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableFilters.sizes.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => handleFilterChange('size', s.value)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                        filters.size === s.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {SIZES[s.value]} ({s.count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sex */}
            {availableFilters?.sexes && availableFilters.sexes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Sexo
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableFilters.sexes.map((sx) => (
                    <button
                      key={sx.value}
                      onClick={() => handleFilterChange('sex', sx.value)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                        filters.sex === sx.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {SEXES[sx.value]} ({sx.count})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, onRemove }) {
  return (
    <div className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}
