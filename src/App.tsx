import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { RoleRoute } from '@/components/RoleRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { HomePage } from '@/components/HomePage'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { MyTasks } from '@/pages/MyTasks'
import { Calendar } from '@/pages/Calendar'
import { Projects } from '@/pages/Projects'
import { ProjectBoard } from '@/pages/ProjectBoard'
import { History } from '@/pages/History'
import { Sops } from '@/pages/Sops'
import { Settings } from '@/pages/Settings'
import { Accountability } from '@/pages/Accountability'
import { GoogleCallback } from '@/pages/GoogleCallback'
import { InstallPrompt } from '@/components/InstallPrompt'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/settings/google-callback" element={<GoogleCallback />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="accountability" element={<RoleRoute fullAccessOnly><Accountability /></RoleRoute>} />
              <Route path="dashboard" element={<RoleRoute fullAccessOnly><Dashboard /></RoleRoute>} />
              <Route path="checklist" element={<Navigate to="/" replace />} />
              <Route path="tasks" element={<RoleRoute fullAccessOnly><MyTasks /></RoleRoute>} />
              <Route path="calendar" element={<RoleRoute fullAccessOnly calendarOnly><Calendar /></RoleRoute>} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:slug" element={<ProjectBoard />} />
              <Route path="history" element={<RoleRoute fullAccessOnly><History /></RoleRoute>} />
              <Route path="sops" element={<RoleRoute fullAccessOnly><Sops /></RoleRoute>} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <InstallPrompt />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
