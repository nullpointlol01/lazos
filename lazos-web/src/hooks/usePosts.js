import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '@/config/api'

export function usePosts(filters = {}) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [meta, setMeta] = useState(null)
  const [availableFilters, setAvailableFilters] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const fetchPosts = useCallback(async () => {
      try {
        setLoading(true)
        setError(null)

        // Construir query params
        const params = new URLSearchParams()
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            params.append(key, value)
          }
        })

        const response = await fetch(`${API_URL}/api/v1/posts?${params}`)

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        setPosts(data.data || [])
        setMeta(data.meta || null)
        setAvailableFilters(data.available_filters || null)
      } catch (err) {
        console.error('Error fetching posts:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }, [filters])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts, refreshTrigger])

  const refetch = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  return { posts, loading, error, meta, availableFilters, refetch }
}
