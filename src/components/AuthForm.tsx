import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/useSupabase'
import { toast } from '@/hooks/use-toast'
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring'
import { signInSchema, signUpSchema, type SignInFormData, type SignUpFormData } from '@/lib/validation'
import { Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react'

export function AuthForm() {
  const [formData, setFormData] = useState<SignInFormData & { fullName: string }>({
    email: '',
    password: '',
    fullName: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('signin')
  
  const { signUp, signIn } = useAuth()
  const { 
    checkAuthRateLimit, 
    checkPasswordStrength, 
    logSecurityEvent, 
    clearRateLimit,
    isBlocked 
  } = useSecurityMonitoring()

  // Password strength for signup
  const passwordStrength = activeTab === 'signup' ? checkPasswordStrength(formData.password) : null

  // Validation function
  const validateForm = (isSignUp: boolean) => {
    const schema = isSignUp ? signUpSchema : signInSchema
    const dataToValidate = isSignUp ? formData : { email: formData.email, password: formData.password }
    
    const result = schema.safeParse(dataToValidate)
    
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      result.error.errors.forEach(error => {
        newErrors[error.path[0] as string] = error.message
      })
      setErrors(newErrors)
      return false
    }
    
    setErrors({})
    return true
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Rate limit check
    if (!checkAuthRateLimit()) {
      return
    }
    
    // Validation
    if (!validateForm(true)) {
      logSecurityEvent('validation_failed', { 
        operation: 'signup',
        errors: Object.keys(errors)
      })
      return
    }
    
    setLoading(true)

    try {
      const { error } = await signUp(formData.email, formData.password, formData.fullName)
      if (error) throw error
      
      // Clear rate limits on success
      clearRateLimit('auth')
      
      logSecurityEvent('signup_success', { 
        email: formData.email.substring(0, 3) + '*****' // Partially masked
      })
      
      toast({
        title: "Account created successfully",
        description: "Please check your email to verify your account.",
      })
    } catch (error: any) {
      logSecurityEvent('signup_failed', { 
        error: error.message,
        email: formData.email.substring(0, 3) + '*****'
      })
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Rate limit check
    if (!checkAuthRateLimit()) {
      return
    }
    
    // Validation
    if (!validateForm(false)) {
      logSecurityEvent('validation_failed', { 
        operation: 'signin',
        errors: Object.keys(errors)
      })
      return
    }
    
    setLoading(true)

    try {
      const { error } = await signIn(formData.email, formData.password)
      if (error) throw error
      
      // Clear rate limits on success
      clearRateLimit('auth')
      
      logSecurityEvent('signin_success', { 
        email: formData.email.substring(0, 3) + '*****'
      })
      
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      })
    } catch (error: any) {
      logSecurityEvent('signin_failed', { 
        error: error.message,
        email: formData.email.substring(0, 3) + '*****'
      })
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Training Analytics
          </CardTitle>
          <CardDescription>
            Sign in to access your training data and AI-powered insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isBlocked && (
            <Alert className="mb-4" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Too many failed attempts. Please wait before trying again.
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue="signin" className="space-y-4" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                    required
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading || isBlocked}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className={errors.fullName ? 'border-destructive' : ''}
                    required
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                    required
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                  
                  {/* Password Strength Indicator */}
                  {formData.password && passwordStrength && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Password strength:</span>
                        <span className={`text-sm font-medium ${
                          passwordStrength.strength === 'weak' ? 'text-destructive' :
                          passwordStrength.strength === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                        </span>
                      </div>
                      <Progress 
                        value={(passwordStrength.score / 5) * 100} 
                        className="h-2"
                      />
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className={passwordStrength.checks.length ? 'text-green-600' : 'text-muted-foreground'}>
                          ✓ 8+ characters
                        </div>
                        <div className={passwordStrength.checks.uppercase ? 'text-green-600' : 'text-muted-foreground'}>
                          ✓ Uppercase letter
                        </div>
                        <div className={passwordStrength.checks.lowercase ? 'text-green-600' : 'text-muted-foreground'}>
                          ✓ Lowercase letter
                        </div>
                        <div className={passwordStrength.checks.number ? 'text-green-600' : 'text-muted-foreground'}>
                          ✓ Number
                        </div>
                        <div className={passwordStrength.checks.special ? 'text-green-600' : 'text-muted-foreground'}>
                          ✓ Special character
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading || isBlocked || (passwordStrength?.strength === 'weak')}>
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}