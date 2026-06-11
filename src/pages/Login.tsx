import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { AppLogo } from '@/components/ui/AppLogo'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Supabase not configured</CardTitle>
            <CardDescription>
              Copy <code className="text-accent">.env.example</code> to <code className="text-accent">.env</code> and add your Supabase URL and anon key. Then run the migration in <code className="text-accent">supabase/migrations/</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const result = isSignUp
      ? await signUp(email, password, displayName)
      : await signIn(email, password)

    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else if (isSignUp && 'needsEmailConfirmation' in result && result.needsEmailConfirmation) {
      setSuccess('Account created. Check your email to confirm, then sign in.')
      setIsSignUp(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <AppLogo size="lg" className="mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Argh Roy CRM</h1>
          <p className="text-muted mt-1">Your personal task & project hub</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isSignUp ? 'Create account' : 'Welcome back'}</CardTitle>
            <CardDescription>
              {isSignUp ? 'Sign up to get started' : 'Sign in to your CRM'}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <Input
                id="displayName"
                label="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Argh roy"
              />
            )}
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />

            {error && (
              <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-sm text-success bg-green-500/10 rounded-lg px-3 py-2">{success}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-4">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess('') }}
              className="text-accent hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </Card>
      </div>
    </div>
  )
}
