import { useState, useRef, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'

// Rate limiting configuration
const RATE_LIMITS = {
  auth: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000 // 30 minutes
  },
  fileUpload: {
    maxAttempts: 10,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000 // 5 minutes
  }
}

interface AttemptRecord {
  timestamp: number
  count: number
  blocked: boolean
  blockExpires?: number
}

export function useSecurityMonitoring() {
  const authAttempts = useRef<Map<string, AttemptRecord>>(new Map())
  const uploadAttempts = useRef<Map<string, AttemptRecord>>(new Map())
  
  const [isBlocked, setIsBlocked] = useState(false)

  // Get client identifier (simplified approach)
  const getClientId = useCallback((): string => {
    return `${navigator.userAgent}-${screen.width}x${screen.height}`
  }, [])

  // Generic rate limiting function
  const checkRateLimit = useCallback((
    attemptsMap: Map<string, AttemptRecord>,
    limits: typeof RATE_LIMITS.auth,
    operation: string
  ): boolean => {
    const clientId = getClientId()
    const now = Date.now()
    const existing = attemptsMap.get(clientId)

    // Check if currently blocked
    if (existing?.blocked && existing.blockExpires && now < existing.blockExpires) {
      const remainingMs = existing.blockExpires - now
      const remainingMin = Math.ceil(remainingMs / 60000)
      
      toast({
        title: "Too many attempts",
        description: `Please wait ${remainingMin} minute(s) before trying again.`,
        variant: "destructive",
      })
      
      setIsBlocked(true)
      return false
    }

    // Clear expired records
    if (existing && now - existing.timestamp > limits.windowMs) {
      attemptsMap.delete(clientId)
    }

    // Get current attempt count
    const record = attemptsMap.get(clientId) || { timestamp: now, count: 0, blocked: false }
    
    // Increment attempt count
    record.count += 1
    record.timestamp = now

    // Check if limit exceeded
    if (record.count > limits.maxAttempts) {
      record.blocked = true
      record.blockExpires = now + limits.blockDurationMs
      
      // Log security event
      console.warn(`Security: Rate limit exceeded for ${operation}`, {
        clientId: clientId.substring(0, 50), // Truncated for privacy
        attempts: record.count,
        timestamp: new Date().toISOString()
      })
      
      toast({
        title: "Too many attempts",
        description: `Too many ${operation} attempts. Please wait before trying again.`,
        variant: "destructive",
      })
      
      setIsBlocked(true)
      attemptsMap.set(clientId, record)
      return false
    }

    attemptsMap.set(clientId, record)
    setIsBlocked(false)
    return true
  }, [getClientId])

  // Auth rate limiting
  const checkAuthRateLimit = useCallback((): boolean => {
    return checkRateLimit(authAttempts.current, RATE_LIMITS.auth, 'authentication')
  }, [checkRateLimit])

  // File upload rate limiting
  const checkUploadRateLimit = useCallback((): boolean => {
    return checkRateLimit(uploadAttempts.current, RATE_LIMITS.fileUpload, 'file upload')
  }, [checkRateLimit])

  // Security logging function
  const logSecurityEvent = useCallback((event: string, details: Record<string, any>) => {
    const logData = {
      event,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 200), // Truncated
      ...details
    }
    
    console.warn('Security Event:', logData)
    
    // In production, this could send to a monitoring service
    // sendToMonitoringService(logData)
  }, [])

  // Password strength checker
  const checkPasswordStrength = useCallback((password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    }
    
    const score = Object.values(checks).filter(Boolean).length
    const strength = score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong'
    
    return { checks, score, strength }
  }, [])

  // Clear rate limits (for successful operations)
  const clearRateLimit = useCallback((type: 'auth' | 'upload') => {
    const clientId = getClientId()
    if (type === 'auth') {
      authAttempts.current.delete(clientId)
    } else {
      uploadAttempts.current.delete(clientId)
    }
    setIsBlocked(false)
  }, [getClientId])

  return {
    checkAuthRateLimit,
    checkUploadRateLimit,
    logSecurityEvent,
    checkPasswordStrength,
    clearRateLimit,
    isBlocked
  }
}