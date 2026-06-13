import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GlassPanel } from '@/components/ui/GlassPanel'
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
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="app-ambient" aria-hidden />
        <GlassPanel title="Setup required" className="max-w-md w-full relative z-10 p-5">
          <p className="text-sm text-muted px-5 pb-5">
            Copy <code className="text-accent">.env.example</code> to <code className="text-accent">.env</code> and add your Supabase URL and anon key.
          </p>
        </GlassPanel>
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
    <div className="relative min-h-screen flex flex-col lg:flex-row">
      <div className="app-ambient" aria-hidden />

      <div className="relative z-10 hidden lg:flex lg:w-[45%] flex-col justify-between p-12 border-r border-white/10">
        <AppLogo size="md" showText />
        <div>
          <h1 className="text-4xl font-bold text-foreground font-display tracking-tight leading-tight">
            Your personal<br />command center
          </h1>
          <p className="text-muted mt-4 max-w-sm leading-relaxed">
            Tasks, checklist, projects, and Google sync — built for how you actually work.
          </p>
        </div>
        <p className="text-xs text-muted/70">Argh Roy CRM</p>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md page-enter">
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <AppLogo size="lg" className="mb-4" />
            <h1 className="text-2xl font-bold text-foreground font-display">Argh Roy CRM</h1>
          </div>

          <GlassPanel
            title={isSignUp ? 'Create account' : 'Welcome back'}
            bodyClassName="px-5 pb-5"
          >
            <p className="text-sm text-muted -mt-2 mb-5">
              {isSignUp ? 'Sign up to get started' : 'Sign in to continue'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <Input
                  id="displayName"
                  label="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
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
                <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2 ring-1 ring-danger/20">{error}</p>
              )}
              {success && (
                <p className="text-sm text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2 ring-1 ring-emerald-500/20">{success}</p>
              )}

              <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
                {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted mt-5">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess('') }}
                className="text-accent hover:text-accent-hover font-medium"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}
