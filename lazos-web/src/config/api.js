/**
 * API Configuration
 * Centralized API URL configuration to avoid hardcoded values
 */

// Get API URL from environment variable or fallback to localhost
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Georef API (Argentina government geocoding service - public API, OK to hardcode)
export const GEOREF_API_URL = 'https://apis.datos.gob.ar/georef/api'

// OpenStreetMap Nominatim (public geocoding service - OK to hardcode)
export const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org'

export default {
  API_URL,
  GEOREF_API_URL,
  NOMINATIM_API_URL,
}
