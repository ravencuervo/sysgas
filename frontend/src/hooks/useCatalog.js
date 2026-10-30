import { friendlyError } from '../lib/forms'
import { useEffect, useState } from 'react'
import { catalog } from '../lib/supabase'
export function useCatalog() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    catalog().then(data => { if (active) setProducts(data) }).catch(e => { if (active) setError(friendlyError(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  return { products, error, loading }
}
