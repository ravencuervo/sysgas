import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSession() {
  const [session, setSession] = useState(null)
  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, current) => setSession(current))
    return () => subscription.unsubscribe()
  }, [])
  return session
}
