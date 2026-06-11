import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { exchangeGoogleCode, syncGoogle } from '@/lib/googleCalendar'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'

export function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [error, setError] = useState('')
  const processed = useRef(false)

  useEffect(() => {
    if (loading) return

    const oauthError = searchParams.get('error')
    if (oauthError) {
      setError(searchParams.get('error_description') ?? oauthError)
      return
    }

    const code = searchParams.get('code')
    if (!code) {
      setError('No authorization code received')
      return
    }

    if (!session) {
      setError('Your CRM session expired. Sign in again, then reconnect Google from Settings.')
      return
    }

    if (processed.current) return
    processed.current = true

    exchangeGoogleCode(code)
      .then(() => syncGoogle('full', { setupWatch: true }))
      .then(() => navigate('/settings?google=connected'))
      .catch((err) => setError(err.message ?? 'Failed to connect Google Calendar'))
  }, [loading, session, searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        {error ? (
          <>
            <CardTitle className="text-danger">Connection failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </>
        ) : (
          <>
            <CardTitle>Connecting Google Calendar...</CardTitle>
            <CardDescription>
              {loading ? 'Restoring your session...' : 'Please wait while we complete the setup.'}
            </CardDescription>
          </>
        )}
      </Card>
    </div>
  )
}
