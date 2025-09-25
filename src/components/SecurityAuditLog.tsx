import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, AlertTriangle, Info, CheckCircle, Download, Trash2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface SecurityEvent {
  id: string
  event: string
  timestamp: string
  severity: 'info' | 'warning' | 'error' | 'success'
  details: Record<string, any>
  userAgent?: string
}

export function SecurityAuditLog() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(false)

  // Load security events from localStorage (in production, this would come from backend)
  useEffect(() => {
    const loadEvents = () => {
      try {
        const stored = localStorage.getItem('security_audit_log')
        if (stored) {
          const parsedEvents = JSON.parse(stored)
          setEvents(parsedEvents.slice(0, 100)) // Keep only last 100 events
        }
      } catch (error) {
        console.error('Failed to load security events:', error)
      }
    }

    loadEvents()

    // Listen for new security events
    const handleSecurityEvent = (event: CustomEvent<SecurityEvent>) => {
      const newEvent = {
        ...event.detail,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }

      setEvents(prev => {
        const updated = [newEvent, ...prev].slice(0, 100)
        
        // Store in localStorage
        try {
          localStorage.setItem('security_audit_log', JSON.stringify(updated))
        } catch (error) {
          console.error('Failed to store security event:', error)
        }
        
        return updated
      })
    }

    window.addEventListener('securityEvent', handleSecurityEvent as EventListener)
    
    return () => {
      window.removeEventListener('securityEvent', handleSecurityEvent as EventListener)
    }
  }, [])

  const getSeverityIcon = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'error':
        return 'destructive'
      case 'warning':
        return 'secondary'
      case 'success':
        return 'default'
      default:
        return 'outline'
    }
  }

  const exportLogs = () => {
    try {
      const dataStr = JSON.stringify(events, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `security-audit-log-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
      
      toast({
        title: 'Logs exported',
        description: 'Security audit log has been downloaded.',
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export security logs.',
        variant: 'destructive',
      })
    }
  }

  const clearLogs = () => {
    setEvents([])
    localStorage.removeItem('security_audit_log')
    toast({
      title: 'Logs cleared',
      description: 'Security audit log has been cleared.',
    })
  }

  const formatEventDetails = (details: Record<string, any>) => {
    const important = ['error', 'fileCount', 'totalSize', 'attempts', 'email']
    const filtered = Object.entries(details)
      .filter(([key]) => important.includes(key))
      .slice(0, 3)
    
    return filtered.map(([key, value]) => `${key}: ${String(value).substring(0, 50)}`)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Audit Log
            </CardTitle>
            <CardDescription>
              Recent security events and monitoring activities
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportLogs}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={clearLogs}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No security events recorded yet. Events will appear here as they occur.
            </AlertDescription>
          </Alert>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  {getSeverityIcon(event.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{event.event}</span>
                      <Badge variant={getSeverityColor(event.severity)} className="text-xs">
                        {event.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                    {Object.keys(event.details).length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {formatEventDetails(event.details).map((detail, i) => (
                          <div key={i}>{detail}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}