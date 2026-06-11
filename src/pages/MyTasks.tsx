import { useState } from 'react'
import {
  HiOutlineSearch,
  HiOutlineCheck,
  HiOutlineExternalLink,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineDotsVertical,
} from 'react-icons/hi'
import { Header } from '@/components/layout/Header'
import { usePageLayout } from '@/hooks/usePageLayout'
import { useTasks } from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useProjects'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { isOverdue } from '@/lib/recurrence'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types/database'
import { TASK_STATUS_LABELS } from '@/types/database'

export function MyTasks() {
  const { openSidebar } = usePageLayout()
  const [search, setSearch] = useState('')
  const [newTask, setNewTask] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const { data: tasks = [], isLoading, addTask, updateTask, deleteTask, refetch } = useTasks()
  const { data: projects = [] } = useProjects()

  const filtered = tasks
    .filter((t) => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase())
      const matchesProject = projectFilter === 'all' || t.project_id === projectFilter
      return matchesSearch && matchesProject && t.status !== 'done' && !t.is_recurring_template
    })
    .sort((a, b) => {
      const aOverdue = isOverdue(a.scheduled_at, false, a.status)
      const bOverdue = isOverdue(b.scheduled_at, false, b.status)
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1
      return 0
    })

  const doneTasks = tasks.filter((t) => t.status === 'done')

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

  const TaskRow = ({ task }: { task: Task }) => {
    const overdue = isOverdue(task.scheduled_at, false, task.status)
    return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-l-2 glass-inset group',
      overdue ? 'border-danger' : 'border-accent'
    )}>
      <div className="flex-1 min-w-0">
        {editingId === task.id ? (
          <form
            onSubmit={(e) => { e.preventDefault(); saveEdit(task.id) }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1 glass-inset rounded px-2 py-2 sm:py-1"
            />
            <Button type="submit" size="sm">Save</Button>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground break-words">{task.title}</p>
              {overdue && <Badge variant="warning">Overdue</Badge>}
            </div>
            {task.project && (
              <p className="text-xs text-muted mt-0.5">{task.project.name}</p>
            )}
          </>
        )}
      </div>
      {editingId !== task.id && (
        <div className="flex items-center gap-1 sm:shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <select
            value={task.status}
            onChange={(e) => updateTask.mutate({ id: task.id, status: e.target.value as TaskStatus })}
            className="flex-1 sm:flex-none glass-inset rounded px-2 py-2 sm:py-1 text-muted min-h-[44px] sm:min-h-0"
          >
            {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {task.link_url && (
            <a href={task.link_url} target="_blank" rel="noopener noreferrer" className="p-2.5 text-muted hover:text-foreground active:bg-white/5 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
              <HiOutlineExternalLink className="h-4 w-4" />
            </a>
          )}
          <button type="button" onClick={() => updateTask.mutate({ id: task.id, status: 'done' })} className="border-0 p-2.5 text-muted outline-none hover:text-success active:bg-white/5 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
            <HiOutlineCheck className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => startEdit(task)} className="border-0 p-2.5 text-muted outline-none hover:text-foreground active:bg-white/5 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
            <HiOutlinePencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => deleteTask.mutate(task.id)} className="border-0 p-2.5 text-muted outline-none hover:text-danger active:bg-white/5 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
            <HiOutlineTrash className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )}

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="My Tasks"
        subtitle="Tasks assigned to you and your personal tasks"
        onMenuClick={openSidebar}
        onRefresh={() => refetch()}
      />

      <div className="flex-1 p-4 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-inset pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="glass-inset px-3 py-2 text-foreground min-h-[44px] sm:min-h-0"
          >
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Add a task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="flex-1"
          />
          <input
            type="datetime-local"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
            className="glass-inset px-3 py-2 text-foreground min-h-[44px] sm:min-h-0"
            title="Schedule (syncs to Google Calendar)"
          />
          <Button type="submit" disabled={!newTask.trim()} className="w-full sm:w-auto min-h-[44px]">Add task</Button>
        </form>
        <p className="text-xs text-muted -mt-2">All tasks sync to Google Tasks. Add a date/time to also sync to Google Calendar.</p>

        {isLoading ? (
          <div className="text-center text-muted py-12">Loading tasks...</div>
        ) : (
          <div className="space-y-6">
            <section>
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted mb-3">
                <HiOutlineDotsVertical className="h-4 w-4" />
                Active ({filtered.length})
              </h3>
              <div className="space-y-2">
                {filtered.length === 0 ? (
                  <Card className="text-center text-muted py-8">No active tasks</Card>
                ) : (
                  filtered.map((task) => <TaskRow key={task.id} task={task} />)
                )}
              </div>
            </section>

            {doneTasks.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-muted mb-3">
                  Completed ({doneTasks.length})
                </h3>
                <div className="space-y-2">
                  {doneTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 glass-inset opacity-60">
                      <HiOutlineCheck className="h-4 w-4 text-success shrink-0" />
                      <span className="text-sm line-through text-muted flex-1">{task.title}</span>
                      <button
                        onClick={() => updateTask.mutate({ id: task.id, status: 'todo' })}
                        className="text-xs text-accent hover:underline"
                      >
                        Reopen
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
