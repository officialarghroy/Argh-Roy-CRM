import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { HiOutlineGlobe, HiOutlineViewBoards, HiOutlineSave, HiOutlineTrash, HiOutlineCalendar } from 'react-icons/hi'
import { resetCalendarAndOverdue } from '@/lib/resetCalendarData'
import {
  getGoogleAuthUrl,
  getGoogleIntegration,
  syncGoogle,
  disconnectGoogle,
  resumeGoogleSync,
  isGoogleCalendarConfigured,
  isGoogleSyncPaused,
} from '@/lib/googleCalendar'
import { Header } from '@/components/layout/Header'
import { usePageLayout } from '@/hooks/usePageLayout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { AvatarPicker } from '@/components/profile/AvatarPicker'
import { TeamSettings } from '@/components/settings/TeamSettings'
import { ProjectSharingSettings } from '@/components/settings/ProjectSharingSettings'
import { Toggle } from '@/components/ui/Toggle'
import { DEFAULT_SIDEBAR_PREFS, type SidebarPrefs } from '@/types/database'

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Calcutta',
  'Asia/Tokyo',
  'Australia/Sydney',
]

export function Settings() {
  const { openSidebar } = usePageLayout()
  const { profile, user, refreshProfile, isAdmin, googleSyncEnabled, canAccessCalendar } = useAuth()
  const [searchParams] = useSearchParams()
  const [googleIntegration, setGoogleIntegration] = useState<{
    last_synced_at: string | null
    sync_enabled: boolean
    tasks_sync_enabled: boolean
  } | null>(null)
  const [syncing, setSyncing] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [sidebarPrefs, setSidebarPrefs] = useState<SidebarPrefs>(DEFAULT_SIDEBAR_PREFS)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState('')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '')
      setAvatarUrl(profile.avatar_url ?? '')
      setTimezone(profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
      setSidebarPrefs({ ...DEFAULT_SIDEBAR_PREFS, ...profile.sidebar_prefs })
    }
  }, [profile])

  useEffect(() => {
    getGoogleIntegration().then(setGoogleIntegration)
    if (searchParams.get('google') === 'connected') {
      showMessage('Google Calendar connected')
      getGoogleIntegration().then(setGoogleIntegration)
    }
  }, [searchParams])

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, avatar_url: avatarUrl || null })
      .eq('id', user.id)
    setSaving(false)
    if (error) showMessage('Failed to save profile')
    else { showMessage('Profile saved'); refreshProfile() }
  }

  const saveTimezone = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ timezone }).eq('id', user.id)
    setSaving(false)
    if (error) showMessage('Failed to save timezone')
    else { showMessage('Timezone saved'); refreshProfile() }
  }

  const saveSidebar = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ sidebar_prefs: sidebarPrefs }).eq('id', user.id)
    setSaving(false)
    if (error) showMessage('Failed to save sidebar preferences')
    else { showMessage('Sidebar preferences saved'); refreshProfile() }
  }

  const useDeviceTimezone = () => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Settings" onMenuClick={openSidebar} />

      {message && (
        <div className="mx-4 lg:mx-6 mt-4 px-4 py-2 rounded-lg bg-accent/15 text-accent text-sm">
          {message}
        </div>
      )}

      <div className="flex-1 p-4 lg:p-6 space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your profile name and picture.</CardDescription>
          </CardHeader>

          {user && (
            <div className="mb-6">
              <AvatarPicker
                userId={user.id}
                displayName={displayName}
                avatarUrl={avatarUrl}
                onAvatarUrlChange={setAvatarUrl}
                onError={showMessage}
              />
            </div>
          )}

          <div className="space-y-4">
            <Input
              id="displayName"
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input
              id="email"
              label="Email"
              value={profile?.email ?? ''}
              disabled
              hint="Email cannot be changed."
            />
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto min-h-[44px]">
              <HiOutlineSave className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HiOutlineGlobe className="h-5 w-5 text-muted" />
              <CardTitle>Regional</CardTitle>
            </div>
            <CardDescription>Times such as task completions are shown in your chosen timezone.</CardDescription>
          </CardHeader>

          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full glass-inset px-3 py-2 text-sm mb-4"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button variant="secondary" onClick={useDeviceTimezone} className="w-full sm:w-auto min-h-[44px]">Use device timezone</Button>
            <Button onClick={saveTimezone} disabled={saving} className="w-full sm:w-auto min-h-[44px]">
              <HiOutlineSave className="h-4 w-4" />
              Save timezone
            </Button>
          </div>
        </Card>

        {isAdmin && googleSyncEnabled && <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HiOutlineCalendar className="h-5 w-5 text-muted" />
              <CardTitle>Google Calendar & Tasks</CardTitle>
            </div>
            <CardDescription>
              Calendar syncs timed tasks. All tasks sync to Google Tasks. Changes push instantly; Google updates pull every few seconds while the app is open.
            </CardDescription>
          </CardHeader>

          {!isGoogleCalendarConfigured ? (
            <p className="text-sm text-muted">Add <code className="text-accent">VITE_GOOGLE_CLIENT_ID</code> to your .env file.</p>
          ) : googleIntegration ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-success">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success shrink-0" />
                  Connected
                </span>
                {googleIntegration.last_synced_at && (
                  <span className="text-muted text-xs sm:text-sm">
                    Last sync {new Date(googleIntegration.last_synced_at).toLocaleString()}
                  </span>
                )}
              </div>
              {(isGoogleSyncPaused() || googleIntegration.sync_enabled === false || googleIntegration.tasks_sync_enabled === false) && (
                <p className="text-sm text-warning bg-warning/10 rounded-lg px-3 py-2">
                  Auto-sync is paused (usually after a reset). Tasks will not be pulled from Google until you resume.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {(isGoogleSyncPaused() || googleIntegration.sync_enabled === false || googleIntegration.tasks_sync_enabled === false) ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await resumeGoogleSync()
                      getGoogleIntegration().then(setGoogleIntegration)
                      showMessage('Google sync resumed')
                    }}
                  >
                    Resume sync
                  </Button>
                ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={syncing}
                  onClick={async () => {
                    setSyncing(true)
                    try {
                      const result = await syncGoogle('full')
                      const errNote = result.errors?.length ? ` Warnings: ${result.errors[0]}` : ''
                      showMessage(`Sync complete — Calendar: ${result.calendar.pushed}↑ ${result.calendar.pulled}↓ · Tasks: ${result.tasks.pushed}↑ ${result.tasks.pulled}↓${errNote}`)
                      getGoogleIntegration().then(setGoogleIntegration)
                    } catch (err) {
                      showMessage(err instanceof Error ? err.message : 'Sync failed')
                    }
                    setSyncing(false)
                  }}
                >
                  {syncing ? 'Syncing...' : 'Sync now'}
                </Button>
                )}
                <Button variant="ghost" size="sm" onClick={async () => {
                  await disconnectGoogle()
                  setGoogleIntegration(null)
                  showMessage('Disconnected')
                }}>
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => { window.location.href = getGoogleAuthUrl() }}>
              Connect Google Calendar & Tasks
            </Button>
          )}
        </Card>}

        {isAdmin && googleSyncEnabled && <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HiOutlineTrash className="h-5 w-5 text-muted" />
              <CardTitle>Clear calendar & overdue</CardTitle>
            </div>
            <CardDescription>
              Wipes all Google Tasks lists and synced calendar events, clears the CRM, and pauses auto-sync so items do not come back. Use Resume sync in Google settings when you want two-way sync again.
            </CardDescription>
          </CardHeader>
          <Button
            variant="danger"
            size="sm"
            disabled={resetting}
            onClick={async () => {
              if (!window.confirm('Delete all synced Google Calendar events and Google Tasks, and remove overdue/scheduled items from the CRM? This cannot be undone.')) {
                return
              }
              setResetting(true)
              try {
                const result = await resetCalendarAndOverdue()
                await queryClient.invalidateQueries()
                const googleNote = result.googleConnected
                  ? ` · Google: ${result.googleCalendarDeleted} calendar, ${result.googleTasksDeleted} tasks deleted`
                  : ' · Google not connected (CRM only)'
                const warn = result.errors?.length ? ` Warnings: ${result.errors[0]}` : ''
                getGoogleIntegration().then(setGoogleIntegration)
                showMessage(
                  `Reset complete — ${result.tasksRemoved} CRM task(s), ${result.checklistRemoved} checklist item(s)${googleNote}${warn}`
                )
              } catch (err) {
                showMessage(err instanceof Error ? err.message : 'Reset failed')
              }
              setResetting(false)
            }}
          >
            {resetting ? 'Clearing...' : 'Reset calendar & overdue'}
          </Button>
        </Card>}

        {isAdmin && <TeamSettings onMessage={showMessage} />}

        {isAdmin && <ProjectSharingSettings />}

        {isAdmin && <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HiOutlineViewBoards className="h-5 w-5 text-muted" />
              <CardTitle>Sidebar</CardTitle>
            </div>
            <CardDescription>Choose which top-level links appear in the sidebar.</CardDescription>
          </CardHeader>

          <div className="space-y-4">
            <Toggle checked={sidebarPrefs.dashboard ?? true} onChange={(v) => setSidebarPrefs((p) => ({ ...p, dashboard: v }))} label="Dashboard" description="Show in sidebar" />
            <Toggle
              checked={sidebarPrefs.dailyChecklist}
              onChange={(v) => setSidebarPrefs((p) => ({ ...p, dailyChecklist: v }))}
              label="Daily Checklist"
              description="Show in sidebar"
            />
            <Toggle
              checked={sidebarPrefs.accountability ?? true}
              onChange={(v) => setSidebarPrefs((p) => ({ ...p, accountability: v }))}
              label="Alpha Mode"
              description="Show in sidebar"
            />
            <Toggle
              checked={sidebarPrefs.myTasks}
              onChange={(v) => setSidebarPrefs((p) => ({ ...p, myTasks: v }))}
              label="My Tasks"
              description="Show in sidebar"
            />
            {canAccessCalendar && (
              <Toggle checked={sidebarPrefs.calendar ?? true} onChange={(v) => setSidebarPrefs((p) => ({ ...p, calendar: v }))} label="Calendar" description="Show in sidebar" />
            )}
            <Toggle
              checked={sidebarPrefs.projects}
              onChange={(v) => setSidebarPrefs((p) => ({ ...p, projects: v }))}
              label="Projects"
              description="Show in sidebar"
            />
            <Toggle checked={sidebarPrefs.history ?? true} onChange={(v) => setSidebarPrefs((p) => ({ ...p, history: v }))} label="History" description="Show in sidebar" />
            <Toggle
              checked={sidebarPrefs.sops}
              onChange={(v) => setSidebarPrefs((p) => ({ ...p, sops: v }))}
              label="SOPs"
              description="Show in sidebar"
            />
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={saveSidebar} disabled={saving} className="w-full sm:w-auto min-h-[44px]">
              <HiOutlineSave className="h-4 w-4" />
              Save sidebar preferences
            </Button>
          </div>
        </Card>}
      </div>
    </div>
  )
}
