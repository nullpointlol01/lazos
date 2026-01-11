import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '@/config/api'

export function useAlerts(filters = {}) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [meta, setMeta] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const fetchAlerts = useCallback(async () => {
      try {
        setLoading(true)
        setError(null)

        // Build query params
        const params = new URLSearchParams()
        if (filters.page) params.append('page', filters.page)
        if (filters.limit) params.append('limit', filters.limit)
        if (filters.animal_type) params.append('animal_type', filters.animal_type)

        const url = `${API_URL}/api/v1/alerts${params.toString() ? `?${params.toString()}` : ''}`
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Error fetching alerts: ${response.status}`)
        }

        const data = await response.json()
        setAlerts(data.data || [])
        setMeta(data.meta || null)
      } catch (err) {
        console.error('Error fetching alerts:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }, [filters.page, filters.limit, filters.animal_type])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts, refreshTrigger])

  const refetch = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  return { alerts, loading, error, meta, refetch }
}
