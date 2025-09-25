import { useEffect, useCallback, useRef } from 'react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useSupabase'

const IDLE_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const WARNING_TIME = 5 * 60 * 1000 // 5 minutes before timeout

export function useSessionTimeout() {
  const { signOut, user } = useAuth()
  const timeoutRef = useRef<NodeJS.Timeout>()
  const warningRef = useRef<NodeJS.Timeout>()
  const lastActivityRef = useRef<number>(Date.now())

  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now()
    
    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current)
    }

    // Only set timeouts if user is logged in
    if (!user) return

    // Set warning timeout
    warningRef.current = setTimeout(() => {
      toast({
        title: "Session timeout warning",
        description: "Your session will expire in 5 minutes due to inactivity.",
        variant: "destructive",
      })
    }, IDLE_TIMEOUT - WARNING_TIME)

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      toast({
        title: "Session expired",
        description: "You have been logged out due to inactivity.",
        variant: "destructive",
      })
      signOut()
    }, IDLE_TIMEOUT)
  }, [user, signOut])

  const handleActivity = useCallback(() => {
    resetTimeout()
  }, [resetTimeout])

  useEffect(() => {
    if (!user) {
      // Clear timeouts if user is not logged in
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current)
      }
      return
    }

    // Activity event listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Initialize timeout
    resetTimeout()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current)
      }
    }
  }, [user, handleActivity, resetTimeout])

  // Extend session manually
  const extendSession = useCallback(() => {
    resetTimeout()
    toast({
      title: "Session extended",
      description: "Your session has been extended.",
    })
  }, [resetTimeout])

  const getRemainingTime = useCallback(() => {
    const elapsed = Date.now() - lastActivityRef.current
    return Math.max(0, IDLE_TIMEOUT - elapsed)
  }, [])

  return {
    extendSession,
    getRemainingTime
  }
}