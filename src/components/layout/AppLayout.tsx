import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useRecurringGenerator } from '@/hooks/useRecurringGenerator'
import { useGoogleAutoSync } from '@/hooks/useGoogleAutoSync'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useRecurringGenerator()
  useGoogleAutoSync()

  useEffect(() => {
    if (!sidebarOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [sidebarOpen])

  return (
    <div className="relative flex h-dvh overflow-hidden safe-area-x">
      <div className="app-ambient" aria-hidden />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="relative z-10 flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto overscroll-y-contain">
        <Outlet context={{ openSidebar: () => setSidebarOpen(true) }} />
      </main>
    </div>
  )
}
