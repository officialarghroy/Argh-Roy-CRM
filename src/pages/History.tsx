import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { HiOutlineSearch, HiOutlineRefresh } from 'react-icons/hi'
import { Header } from '@/components/layout/Header'
import { usePageLayout } from '@/hooks/usePageLayout'
import { useActivity, useHistorySearch } from '@/hooks/useActivity'
import { useTasks } from '@/hooks/useTasks'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

const ACTION_COLORS: Record<string, string> = {
  created: 'info',
  completed: 'success',
  deleted: 'warning',
  restored: 'info',
  archived: 'default',
  updated: 'default',
  synced: 'info',
}

export function History() {
  const { openSidebar } = usePageLayout()
  const [search, setSearch] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const { data: activity = [], isLoading, refetch } = useActivity(100)
  const { data: searchResults } = useHistorySearch(search)
  const { data: deletedTasks = [], restoreTask } = useTasks({ includeDeleted: true, includeArchived: true })

  const trashed = deletedTasks.filter((t) => t.deleted_at)

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="History"
        subtitle="Lifetime record of everything you've done"
        onMenuClick={openSidebar}
        onRefresh={() => refetch()}
      />

      <div className="flex-1 p-4 lg:p-6 space-y-6 max-w-4xl">
        <div className="relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            placeholder="Search all tasks and history..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-inset pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        {search.trim().length > 1 && searchResults && (
          <Card>
            <h3 className="font-medium mb-3">Search results</h3>
            <div className="space-y-2">
              {searchResults.tasks.map((task: { id: string; title: string; status: string; deleted_at?: string }) => (
                <div key={task.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 glass-inset">
                  <span className="text-sm break-words">{task.title}</span>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Badge>{task.status}</Badge>
                    {task.deleted_at && <Badge variant="warning">Deleted</Badge>}
                  </div>
                </div>
              ))}
              {searchResults.tasks.length === 0 && (
                <p className="text-sm text-muted">No tasks found</p>
              )}
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Activity timeline</h2>
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className="text-xs text-accent hover:underline"
          >
            {showDeleted ? 'Hide' : 'Show'} deleted items ({trashed.length})
          </button>
        </div>

        {isLoading ? (
          <p className="text-muted text-center py-12">Loading history...</p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />
            <div className="space-y-4">
              {activity.map((entry) => (
                <div key={entry.id} className="relative pl-10">
                  <div className="absolute left-2.5 top-2 h-3 w-3 rounded-full bg-accent border-2 border-surface" />
                  <Card className="py-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize">
                          {entry.action} {entry.entity_type.replace('_', ' ')}
                        </p>
                        {entry.snapshot?.title != null && (
                          <p className="text-sm text-muted mt-0.5 break-words">{String(entry.snapshot.title)}</p>
                        )}
                      </div>
                      <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
                        <Badge variant={(ACTION_COLORS[entry.action] ?? 'default') as 'info' | 'success' | 'warning' | 'default'}>
                          {entry.action}
                        </Badge>
                        <p className="text-xs text-muted sm:mt-1">
                          {format(parseISO(entry.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

        {showDeleted && trashed.length > 0 && (
          <Card>
            <h3 className="font-medium mb-3">Deleted tasks (kept forever)</h3>
            <div className="space-y-2">
              {trashed.map((task) => (
                <div key={task.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 glass-inset">
                  <div className="min-w-0">
                    <p className="text-sm line-through text-muted break-words">{task.title}</p>
                    {task.deleted_at && (
                      <p className="text-xs text-muted">
                        Deleted {format(parseISO(task.deleted_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => restoreTask.mutate(task.id)}>
                    <HiOutlineRefresh className="h-4 w-4" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
