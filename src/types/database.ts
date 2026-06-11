export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'scheduled'
export type ProjectStatus = 'active' | 'archived'
export type UserRole = 'admin' | 'collaborator'
export type EntityType = 'task' | 'checklist' | 'project' | 'sop' | 'checklist_template'
export type ActivityAction = 'created' | 'updated' | 'completed' | 'uncompleted' | 'archived' | 'restored' | 'deleted' | 'scheduled' | 'synced'

export interface SidebarPrefs {
  dailyChecklist: boolean
  myTasks: boolean
  projects: boolean
  sops: boolean
  calendar: boolean
  history: boolean
  dashboard: boolean
}

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  email: string | null
  timezone: string
  role: UserRole
  calendar_access: boolean
  google_sync_enabled: boolean
  full_access: boolean
  sidebar_prefs: SidebarPrefs
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  added_by: string | null
  created_at: string
  profile?: Pick<Profile, 'id' | 'display_name' | 'email' | 'avatar_url'> | null
}

export interface Project {
  id: string
  user_id: string
  name: string
  slug: string
  logo_url: string | null
  status: ProjectStatus
  deleted_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface ProjectWithStats extends Project {
  total_tasks: number
  completed_tasks: number
}

export interface TaskSection {
  id: string
  user_id: string
  name: string
  position: number
  project_id: string | null
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  project_id: string | null
  section_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  link_url: string | null
  position: number
  completed_at: string | null
  due_date: string | null
  scheduled_at: string | null
  duration_minutes: number | null
  recurrence_rule: string | null
  recurrence_parent_id: string | null
  is_recurring_template: boolean
  google_event_id: string | null
  google_calendar_id: string | null
  google_task_id: string | null
  google_task_list_id: string | null
  deleted_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  project?: Pick<Project, 'id' | 'name' | 'slug'> | null
}

export interface DailyChecklistItem {
  id: string
  user_id: string
  title: string
  date: string
  completed: boolean
  position: number
  template_id: string | null
  scheduled_at: string | null
  completed_at: string | null
  deleted_at: string | null
  google_event_id: string | null
  created_at: string
}

export interface ChecklistTemplate {
  id: string
  user_id: string
  title: string
  recurrence_rule: string
  scheduled_time: string | null
  position: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface ActivityLogEntry {
  id: string
  user_id: string
  entity_type: EntityType
  entity_id: string
  action: ActivityAction
  snapshot: Record<string, unknown> | null
  created_at: string
}

export interface TaskCompletion {
  id: string
  user_id: string
  task_id: string
  completed_at: string
  notes: string | null
  duration_minutes: number | null
  created_at: string
}

export interface UserIntegration {
  id: string
  user_id: string
  provider: string
  calendar_id: string
  sync_enabled: boolean
  last_synced_at: string | null
  created_at: string
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  type: 'task' | 'checklist'
  status?: TaskStatus
  completed?: boolean
  overdue?: boolean
  projectName?: string
  resourceId?: string
}

export interface Sop {
  id: string
  user_id: string
  title: string
  content: string | null
  project_id: string | null
  deleted_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
  scheduled: 'Scheduled',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-blue-500',
  in_progress: 'bg-orange-500',
  review: 'bg-purple-500',
  done: 'bg-green-500',
  scheduled: 'bg-zinc-500',
}

export const DEFAULT_SIDEBAR_PREFS: SidebarPrefs = {
  dashboard: true,
  dailyChecklist: true,
  myTasks: true,
  projects: true,
  calendar: true,
  history: true,
  sops: true,
}
