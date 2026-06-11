import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { HiOutlineArrowLeft, HiOutlinePlus } from 'react-icons/hi'
import { Header } from '@/components/layout/Header'
import { usePageLayout } from '@/hooks/usePageLayout'
import { useProject, useProjects } from '@/hooks/useProjects'
import { ProjectLogoPicker } from '@/components/projects/ProjectLogoPicker'
import { uploadProjectLogo } from '@/lib/storage'
import { useTasks } from '@/hooks/useTasks'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types/database'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/types/database'

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'scheduled']

function TaskCardContent({ task }: { task: Task }) {
  const { profile } = useAuth()
  return (
    <>
      <p className="text-sm font-medium text-foreground leading-snug">{task.title}</p>
      {task.link_url && (
        <a href={task.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline mt-1 block truncate">
          {task.link_url}
        </a>
      )}
      <div className="flex items-center gap-2 mt-3">
        <Avatar src={profile?.avatar_url} name={profile?.display_name ?? 'You'} size="sm" />
        <span className="text-xs text-muted">{profile?.display_name ?? 'You'}</span>
      </div>
    </>
  )
}

function DraggableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'glass-inset p-3 hover:border-white/20 transition-colors cursor-grab active:cursor-grabbing touch-none',
        isDragging && 'opacity-40'
      )}
    >
      <TaskCardContent task={task} />
    </div>
  )
}

function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div className="glass-inset border-accent/50 p-3 shadow-lg rotate-2">
      <TaskCardContent task={task} />
    </div>
  )
}

function KanbanColumn({
  status,
  tasks,
  count,
}: {
  status: TaskStatus
  tasks: Task[]
  count: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={cn('h-2 w-2 rounded-full', TASK_STATUS_COLORS[status])} />
        <h3 className="text-sm font-medium text-foreground">{TASK_STATUS_LABELS[status]}</h3>
        <span className="text-xs text-muted ml-auto">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 min-h-[200px] rounded-xl glass-inset p-2 transition-colors',
          isOver ? 'border-accent/50 bg-accent/5' : ''
        )}
      >
        {tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}

function MobileTaskList({
  tasks,
  activeStatus,
  onStatusChange,
  updateTask,
}: {
  tasks: Task[]
  activeStatus: TaskStatus | 'all'
  onStatusChange: (status: TaskStatus | 'all') => void
  updateTask: { mutate: (args: { id: string; status: TaskStatus }) => void }
}) {
  const filtered =
    activeStatus === 'all' ? tasks : tasks.filter((t) => t.status === activeStatus)

  return (
    <div className="md:hidden flex flex-col flex-1 min-h-0 pt-3">
      <div className="flex gap-1.5 overflow-x-auto pb-3 px-4 touch-pan-x">
        <button
          type="button"
          onClick={() => onStatusChange('all')}
          className={cn(
            'shrink-0 rounded-full px-3 py-2 text-xs font-medium transition-colors min-h-[36px]',
            activeStatus === 'all'
              ? 'bg-white/12 text-foreground'
              : 'bg-white/5 text-muted hover:text-foreground'
          )}
        >
          All ({tasks.length})
        </button>
        {COLUMNS.map((status) => {
          const count = tasks.filter((t) => t.status === status).length
          return (
            <button
              key={status}
              type="button"
              onClick={() => onStatusChange(status)}
              className={cn(
                'shrink-0 rounded-full px-3 py-2 text-xs font-medium transition-colors min-h-[36px] flex items-center gap-1.5',
                activeStatus === status
                  ? 'bg-white/12 text-foreground'
                  : 'bg-white/5 text-muted hover:text-foreground'
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', TASK_STATUS_COLORS[status])} />
              {TASK_STATUS_LABELS[status]} ({count})
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 px-4 pb-4 safe-area-bottom">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted py-8">No tasks in this column</p>
        ) : (
          filtered.map((task) => (
            <div key={task.id} className="glass-inset p-3 space-y-3">
              <TaskCardContent task={task} />
              <select
                value={task.status}
                onChange={(e) =>
                  updateTask.mutate({ id: task.id, status: e.target.value as TaskStatus })
                }
                className="w-full glass-inset rounded px-3 py-2 text-muted min-h-[44px]"
              >
                {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function ProjectBoard() {
  const { slug } = useParams<{ slug: string }>()
  const { openSidebar } = usePageLayout()
  const { user } = useAuth()
  const { data: project, isLoading: projectLoading } = useProject(slug!)
  const { updateProject } = useProjects()
  const { data: allTasks = [], addTask, updateTask, refetch } = useTasks({ projectId: project?.id })
  const [newTask, setNewTask] = useState('')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [mobileStatus, setMobileStatus] = useState<TaskStatus | 'all'>('all')

  useEffect(() => {
    setLogoUrl(project?.logo_url ?? null)
  }, [project?.logo_url])

  const handleLogoFile = async (file: File | null) => {
    if (!project || !user) return
    if (!file) {
      await updateProject.mutateAsync({ id: project.id, logo_url: null })
      setLogoUrl(null)
      return
    }
    setUploadingLogo(true)
    try {
      const url = await uploadProjectLogo(user.id, project.id, file)
      await updateProject.mutateAsync({ id: project.id, logo_url: url })
      setLogoUrl(url)
    } finally {
      setUploadingLogo(false)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const tasksByStatus = COLUMNS.reduce(
    (acc, status) => {
      acc[status] = allTasks.filter((t) => t.status === status)
      return acc
    },
    {} as Record<TaskStatus, Task[]>
  )

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.trim() || !project) return
    await addTask.mutateAsync({ title: newTask.trim(), project_id: project.id, status: 'todo' })
    setNewTask('')
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = allTasks.find((t) => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    let newStatus: TaskStatus | null = null
    if (COLUMNS.includes(overId as TaskStatus)) {
      newStatus = overId as TaskStatus
    } else {
      const overTask = allTasks.find((t) => t.id === overId)
      if (overTask) newStatus = overTask.status
    }

    if (newStatus) {
      const task = allTasks.find((t) => t.id === taskId)
      if (task && task.status !== newStatus) {
        updateTask.mutate({ id: taskId, status: newStatus })
      }
    }
  }

  if (projectLoading) {
    return <div className="flex items-center justify-center flex-1 text-muted">Loading...</div>
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <p className="text-muted">Project not found</p>
        <Link to="/projects"><Button variant="secondary">Back to projects</Button></Link>
      </div>
    )
  }

  const isOwner = project.user_id === user?.id

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header
        title={project.name}
        onMenuClick={openSidebar}
        onRefresh={() => refetch()}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/projects">
              <Button variant="ghost" size="sm" aria-label="Back to projects" className="min-h-[44px] min-w-[44px]">
                <HiOutlineArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        }
      />

      <div className="px-4 lg:px-6 py-3 border-b border-white/10 space-y-4">
        {isOwner ? (
          <ProjectLogoPicker
            name={project.name}
            logoUrl={logoUrl}
            onLogoUrlChange={(url) => {
              if (!url) void handleLogoFile(null)
              else setLogoUrl(url)
            }}
            onFileSelect={handleLogoFile}
            uploading={uploadingLogo}
            size="md"
          />
        ) : project.logo_url ? (
          <img src={project.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
        ) : null}
        <form onSubmit={handleAdd} className="flex gap-2 max-w-xl">
          <input
            placeholder="Add a task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="flex-1 glass-inset px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 min-h-[44px] sm:min-h-0"
          />
          <Button type="submit" disabled={!newTask.trim()} className="min-h-[44px] min-w-[44px]">
            <HiOutlinePlus className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <MobileTaskList
        tasks={allTasks}
        activeStatus={mobileStatus}
        onStatusChange={setMobileStatus}
        updateTask={updateTask}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="hidden md:block flex-1 overflow-x-auto p-4 lg:p-6 touch-pan-x">
          <div className="flex gap-4 min-w-max h-full">
            {COLUMNS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasksByStatus[status]}
                count={tasksByStatus[status].length}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask && <TaskCardOverlay task={activeTask} />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
