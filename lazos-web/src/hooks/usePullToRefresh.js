import { useEffect, useState } from 'react'

/**
 * Hook for implementing pull-to-refresh functionality
 * @param {Function} onRefresh - Callback function to execute on refresh
 * @returns {Object} - { isPulling, pullProgress }
 */
export function usePullToRefresh(onRefresh) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullProgress, setPullProgress] = useState(0)
  const [startY, setStartY] = useState(0)

  useEffect(() => {
    let touchStartY = 0
    let scrollY = 0
    const threshold = 80 // pixels to trigger refresh

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY
      scrollY = window.scrollY
    }

    const handleTouchMove = (e) => {
      const touchY = e.touches[0].clientY
      const pullDistance = touchY - touchStartY

      // Only trigger if at top of page and pulling down
      if (scrollY <= 0 && pullDistance > 0) {
        const progress = Math.min((pullDistance / threshold) * 100, 100)
        setPullProgress(progress)
        setIsPulling(pullDistance > 10)

        // Add slight resistance
        if (pullDistance > threshold) {
          e.preventDefault()
        }
      }
    }

    const handleTouchEnd = async () => {
      if (pullProgress >= 100) {
        setIsPulling(true)
        try {
          await onRefresh()
        } catch (error) {
          console.error('Refresh error:', error)
        }
      }
      setIsPulling(false)
      setPullProgress(0)
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onRefresh, pullProgress])

  return { isPulling, pullProgress }
}
