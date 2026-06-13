import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  HiOutlineCheck,
  HiOutlineExternalLink,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineCalendar,
  HiOutlineRefresh,
} from 'react-icons/hi'
import { PageShell } from '@/components/layout/PageShell'
import { usePageLayout } from '@/hooks/usePageLayout'
import { useTasks } from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useProjects'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { SearchField } from '@/components/ui/SearchField'
import { EmptyState, ListSectionHeader } from '@/components/ui/ListPrimitives'
import { isOverdue } from '@/lib/recurrence'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types/database'
import { TASK_STATUS_LABELS } from '@/types/database'

function TaskMeta({ task }: { task: Task }) {
  const overdue = isOverdue(task.scheduled_at, false, task.status)
  const scheduledLabel = task.scheduled_at
    ? format(parseISO(task.scheduled_at), 'MMM d · h:mm a')
    : null

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {task.project && (
        <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-muted">
          {task.project.name}
        </span>
      )}
      {scheduledLabel && (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted">
          <HiOutlineCalendar className="h-3 w-3" />
          {scheduledLabel}
        </span>
      )}
      {overdue && <Badge variant="warning">Overdue</Badge>}
      {task.status !== 'todo' && task.status !== 'done' && (
        <span className="text-[11px] font-medium text-accent/90">{TASK_STATUS_LABELS[task.status]}</span>
      )}
    </div>
  )
}

function ActiveTaskRow({
  task,
  editingId,
  editTitle,
  setEditTitle,
  onSaveEdit,
  onStartEdit,
  onComplete,
  onDelete,
  onStatusChange,
}: {
  task: Task
  editingId: string | null
  editTitle: string
  setEditTitle: (v: string) => void
  onSaveEdit: (id: string) => void
  onStartEdit: (task: Task) => void
  onComplete: () => void
  onDelete: () => void
  onStatusChange: (status: TaskStatus) => void
}) {
  const overdue = isOverdue(task.scheduled_at, false, task.status)
  const isEditing = editingId === task.id

  return (
    <li className="group flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors border-b border-white/[0.06] last:border-b-0">
      <button
        type="button"
        onClick={onComplete}
        className={cn(
          'mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
          overdue ? 'border-danger/70 hover:border-danger hover:bg-danger/10' : 'border-amber-400/60 hover:border-emerald-400 hover:bg-emerald-400/10'
        )}
        aria-label="Mark complete"
      />

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <form
            onSubmit={(e) => { e.preventDefault(); onSaveEdit(task.id) }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1 rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <Button type="submit" size="sm">Save</Button>
          </form>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground leading-snug break-words">{task.title}</p>
            <TaskMeta task={task} />
          </>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <select
            value={task.status}
            onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
            className="hidden sm:block max-w-[7rem] truncate rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            aria-label="Task status"
          >
            {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {task.link_url && (
            <a
              href={task.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-white/5"
            >
              <HiOutlineExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            type="button"
            onClick={() => onStartEdit(task)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border-0 text-muted hover:text-foreground hover:bg-white/5"
            aria-label="Edit task"
          >
            <HiOutlinePencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-9 w-9 items-center justify-center rounded-lg border-0 text-muted hover:text-danger hover:bg-danger/10"
            aria-label="Delete task"
          >
            <HiOutlineTrash className="h-4 w-4" />
          </button>
        </div>
      )}
    </li>
  )
}

function CompletedTaskRow({
  task,
  onReopen,
}: {
  task: Task
  onReopen: () => void
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] last:border-b-0">
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 shrink-0">
        <HiOutlineCheck className="h-3.5 w-3.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted line-through truncate">{task.title}</p>
        {task.project && (
          <p className="text-[11px] text-muted/70 mt-0.5 truncate">{task.project.name}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onReopen}
        className="shrink-0 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
      >
        Reopen
      </button>
    </li>
  )
}

export function MyTasks() {
  const { openSidebar } = usePageLayout()
  const [search, setSearch] = useState('')
  const [newTask, setNewTask] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const { data: tasks = [], isLoading, addTask, updateTask, deleteTask, refetch } = useTasks()
  const { data: projects = [] } = useProjects()

  const activeTasks = tasks.filter((t) => t.status !== 'done' && !t.is_recurring_template)
  const doneTasks = tasks.filter((t) => t.status === 'done')

  const filtered = activeTasks
    .filter((t) => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase())
      const matchesProject = projectFilter === 'all' || t.project_id === projectFilter
      return matchesSearch && matchesProject
    })
    .sort((a, b) => {
      const aOverdue = isOverdue(a.scheduled_at, false, a.status)
      const bOverdue = isOverdue(b.scheduled_at, false, b.status)
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1
      return a.position - b.position
    })

  const filteredDone = doneTasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase())
    const matchesProject = projectFilter === 'all' || t.project_id === projectFilter
    return matchesSearch && matchesProject
  })

  const totalVisible = filtered.length + filteredDone.length
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.trim()) return
    await addTask.mutateAsync({
      title: newTask.trim(),
      project_id: projectFilter !== 'all' ? projectFilter : null,
      scheduled_at: scheduleAt ? new Date(scheduleAt).toISOString() : null,
      status: scheduleAt ? 'scheduled' : 'todo',
    })
    setNewTask('')
    setScheduleAt('')
    setShowAddForm(false)
  }

  const startEdit = (task: Task) => {
    setEditingId(task.id)
    setEditTitle(task.title)
  }

  const saveEdit = async (id: string) => {
    if (!editTitle.trim()) return
    await updateTask.mutateAsync({ id, title: editTitle.trim() })
    setEditingId(null)
  }

  return (
    <PageShell
      title="My Tasks"
      subtitle="Personal tasks synced with Google Tasks"
      onMenuClick={openSidebar}
      onRefresh={() => refetch()}
      maxWidth="2xl"
      stats={
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-label">Progress</p>
            <p className="text-lg font-semibold text-foreground mt-0.5 font-display">
              {filtered.length} active
              {filteredDone.length > 0 && (
                <span className="text-muted font-normal"> · {filteredDone.length} done</span>
              )}
            </p>
          </div>
          <ProgressRing done={filteredDone.length} total={totalVisible || 1} />
        </div>
      }
    >
      <GlassPanel
        title="Tasks"
        action={
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/80 hover:bg-white/5 hover:text-foreground transition-colors"
            aria-label="Add task"
          >
            <HiOutlinePlus className="h-5 w-5" />
          </button>
        }
        toolbar={
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="Search tasks..."
                className="flex-1"
              />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="field-base min-h-[44px] sm:min-h-0"
              >
                <option value="all">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {showAddForm && (
              <form onSubmit={handleAdd} className="pt-1 space-y-2 border-t border-white/8">
                <Input
                  autoFocus
                  placeholder="What needs to get done?"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  className="border-white/10 bg-black/20"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="field-base flex-1 min-h-[44px] sm:min-h-0"
                    title="Schedule (syncs to Google Calendar)"
                  />
                  <Button type="submit" disabled={!newTask.trim() || addTask.isPending} className="min-h-[44px] sm:min-w-[7rem]">
                    Add task
                  </Button>
                </div>
                <p className="text-[11px] text-muted flex items-center gap-1.5">
                  <HiOutlineRefresh className="h-3.5 w-3.5 shrink-0" />
                  Syncs to Google Tasks · add a date to also sync Calendar
                </p>
              </form>
            )}
          </div>
        }
      >
        {isLoading ? (
          <EmptyState message="Loading tasks..." />
        ) : filtered.length === 0 && filteredDone.length === 0 ? (
          <EmptyState
            message="No tasks yet"
            action={
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="text-sm font-medium text-accent hover:text-accent-hover"
              >
                Add your first task
              </button>
            }
          />
        ) : (
          <>
            {filtered.length > 0 && (
              <ul>
                {filtered.map((task) => (
                  <ActiveTaskRow
                    key={task.id}
                    task={task}
                    editingId={editingId}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    onSaveEdit={saveEdit}
                    onStartEdit={startEdit}
                    onComplete={() => updateTask.mutate({ id: task.id, status: 'done' })}
                    onDelete={() => deleteTask.mutate(task.id)}
                    onStatusChange={(status) => updateTask.mutate({ id: task.id, status })}
                  />
                ))}
              </ul>
            )}

            {filtered.length === 0 && filteredDone.length > 0 && (
              <EmptyState message="No active tasks — you're all caught up" />
            )}

            {filteredDone.length > 0 && (
              <>
                <ListSectionHeader>Completed · {filteredDone.length}</ListSectionHeader>
                <ul>
                  {filteredDone.map((task) => (
                    <CompletedTaskRow
                      key={task.id}
                      task={task}
                      onReopen={() => updateTask.mutate({ id: task.id, status: 'todo' })}
                    />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </GlassPanel>
    </PageShell>
  )
}
