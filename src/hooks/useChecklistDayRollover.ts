import { useEffect } from 'react'
import { getChecklistDateString } from '@/lib/checklistDay'

/** Refetch checklist when the India-time day rolls over (3 AM). */
export function useChecklistDayRollover(onRollover: () => void) {
  useEffect(() => {
    let lastDate = getChecklistDateString()
    const intervalId = setInterval(() => {
      const current = getChecklistDateString()
      if (current !== lastDate) {
        lastDate = current
        onRollover()
      }
    }, 30_000)

    return () => clearInterval(intervalId)
  }, [onRollover])
}
