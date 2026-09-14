import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Shows the loader briefly on route change. Once real API calls exist
// (e.g. Shop fetching products), this can be swapped for actual loading state.
export function useRouteLoader(delay = 400) {
  const location = useLocation()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => setLoading(false), delay)
    return () => clearTimeout(timer)
  }, [location.pathname, delay])

  return loading
}