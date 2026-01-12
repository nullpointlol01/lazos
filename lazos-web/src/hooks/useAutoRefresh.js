import { useEffect, useState, useRef } from 'react'

/**
 * Hook for auto-refreshing data at regular intervals
 * @param {Function} onRefresh - Callback function to execute on refresh
 * @param {number} intervalMs - Interval in milliseconds (default: 5 minutes)
 * @returns {Object} - { lastUpdate, timeAgo }
 */
export function useAutoRefresh(onRefresh, intervalMs = 5 * 60 * 1000) {
  const [lastUpdate, setLastUpdate] = useState(Date.now())
  const [timeAgo, setTimeAgo] = useState('justo ahora')
  const isScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef(null)

  // Track scrolling to prevent refresh while user is scrolling
  useEffect(() => {
    const handleScroll = () => {
      isScrollingRef.current = true
      clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false
      }, 1000)
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  // Auto-refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      // Don't refresh if user is scrolling or not on the page
      if (!isScrollingRef.current && document.visibilityState === 'visible') {
        onRefresh()
        setLastUpdate(Date.now())
      }
    }, intervalMs)

    return () => clearInterval(interval)
  }, [onRefresh, intervalMs])

  // Update "time ago" text every minute
  useEffect(() => {
    const updateTimeAgo = () => {
      const diffMs = Date.now() - lastUpdate
      const diffMin = Math.floor(diffMs / 60000)

      if (diffMin < 1) {
        setTimeAgo('justo ahora')
      } else if (diffMin === 1) {
        setTimeAgo('hace 1 minuto')
      } else if (diffMin < 60) {
        setTimeAgo(`hace ${diffMin} minutos`)
      } else {
        const diffHours = Math.floor(diffMin / 60)
        setTimeAgo(`hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`)
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [lastUpdate])

  return { lastUpdate, timeAgo, setLastUpdate }
}
