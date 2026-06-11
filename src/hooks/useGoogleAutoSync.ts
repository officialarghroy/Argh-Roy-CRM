import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGoogleIntegration,
  runGoogleSync,
  resumeGoogleSync,
  isGoogleCalendarConfigured,
  isGoogleSyncPaused,
  onAfterGoogleSync,
} from '@/lib/googleCalendar'

const PULL_INTERVAL_MS = 5_000

export function useGoogleAutoSync() {
  const { user, googleSyncEnabled } = useAuth()
  const queryClient = useQueryClient()
  const initialSyncDone = useRef(false)

  useEffect(() => {
    const unregister = onAfterGoogleSync(() => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['checklist'] })
      queryClient.invalidateQueries({ queryKey: ['activity'] })
    })
    return unregister
  }, [queryClient])

  useEffect(() => {
    if (!user || !googleSyncEnabled || !isGoogleCalendarConfigured) return

    const runPull = () => {
      void getGoogleIntegration().then((integration) => {
        if (!integration) return
        if (integration.sync_enabled === false || integration.tasks_sync_enabled === false) return
        void runGoogleSync('pull')
      })
    }

    void (async () => {
      const integration = await getGoogleIntegration()
      if (
        integration &&
        (integration.sync_enabled === false ||
          integration.tasks_sync_enabled === false ||
          isGoogleSyncPaused())
      ) {
        await resumeGoogleSync()
      }
      await runGoogleSync(initialSyncDone.current ? 'pull' : 'full')
      initialSyncDone.current = true
    })()

    const intervalId = setInterval(runPull, PULL_INTERVAL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') runPull()
    }
    window.addEventListener('focus', runPull)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('focus', runPull)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user, googleSyncEnabled])
}
