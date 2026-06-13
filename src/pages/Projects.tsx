import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HiOutlinePlus, HiOutlineViewGrid, HiOutlineViewList } from 'react-icons/hi'
import { PageShell } from '@/components/layout/PageShell'
import { usePageLayout } from '@/hooks/usePageLayout'
import { useProjects } from '@/hooks/useProjects'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Avatar } from '@/components/ui/Avatar'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { SearchField } from '@/components/ui/SearchField'
import { EmptyState } from '@/components/ui/ListPrimitives'
import { ProjectLogoPicker } from '@/components/projects/ProjectLogoPicker'
import { uploadProjectLogo } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'

function ProjectLogoThumb({ name, logoUrl, className }: { name: string; logoUrl: string | null; className?: string }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" className={cn('object-cover shrink-0 ring-1 ring-white/10', className)} />
  }
  return (
    <div className={cn('bg-accent/15 text-accent flex items-center justify-center font-bold shrink-0 ring-1 ring-accent/20', className)}>
      {name[0]}
    </div>
  )
}

export function Projects() {
  const { openSidebar } = usePageLayout()
  const { profile, user, isAdmin } = useAuth()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null)
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null)
  const [creating, setCreating] = useState(false)
  const { data: projects = [], isLoading, addProject, updateProject, refetch } = useProjects()

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const resetNewProjectForm = () => {
    setNewName('')
    setNewLogoPreview(null)
    setNewLogoFile(null)
    setShowNew(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !user) return
    setCreating(true)
    try {
      const project = await addProject.mutateAsync({ name: newName.trim() })
      if (newLogoFile) {
        const logoUrl = await uploadProjectLogo(user.id, project.id, newLogoFile)
        await updateProject.mutateAsync({ id: project.id, logo_url: logoUrl })
      }
      resetNewProjectForm()
      toast.success('Project created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  return (
    <PageShell
      title="Projects"
      subtitle={`${filtered.length} workspace${filtered.length === 1 ? '' : 's'}`}
      onMenuClick={openSidebar}
      onRefresh={() => refetch()}
      maxWidth="6xl"
      actions={
        isAdmin ? (
          <Button size="sm" onClick={() => setShowNew(true)} aria-label="New project">
            <HiOutlinePlus className="h-4 w-4" />
            <span className="hidden sm:inline">New project</span>
          </Button>
        ) : undefined
      }
    >
      <GlassPanel
        title="All projects"
        action={
          <div className="flex glass-pill overflow-hidden">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={cn('p-2 transition-colors', view === 'grid' ? 'bg-white/10 text-foreground' : 'text-muted hover:bg-white/5')}
              aria-label="Grid view"
            >
              <HiOutlineViewGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn('p-2 transition-colors', view === 'list' ? 'bg-white/10 text-foreground' : 'text-muted hover:bg-white/5')}
              aria-label="List view"
            >
              <HiOutlineViewList className="h-4 w-4" />
            </button>
          </div>
        }
        toolbar={
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search projects..."
          />
        }
      >
        {isAdmin && showNew && (
          <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
            <form onSubmit={handleCreate} className="space-y-4">
              <ProjectLogoPicker
                name={newName || 'Project'}
                logoUrl={newLogoPreview}
                onLogoUrlChange={setNewLogoPreview}
                onFileSelect={setNewLogoFile}
                uploading={creating}
                size="lg"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Project name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={!newName.trim() || creating} className="flex-1 sm:flex-none min-h-[44px]">
                    {creating ? 'Creating...' : 'Create'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetNewProjectForm} className="flex-1 sm:flex-none min-h-[44px]">
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <EmptyState message="Loading projects..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No projects yet"
            action={
              isAdmin ? (
                <Button size="sm" onClick={() => setShowNew(true)}>
                  <HiOutlinePlus className="h-4 w-4" />
                  Create your first project
                </Button>
              ) : undefined
            }
          />
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4 sm:p-5 sm:pt-4">
            {filtered.map((project) => (
              <Link key={project.id} to={`/projects/${project.slug}`} className="block p-1">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 h-full transition-all duration-150 hover:bg-white/[0.04] hover:border-white/16 hover:ring-1 hover:ring-white/10">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <ProjectLogoThumb name={project.name} logoUrl={project.logo_url} className="h-10 w-10 rounded-xl" />
                      <h3 className="font-semibold text-foreground truncate font-display">{project.name}</h3>
                    </div>
                    {project.user_id !== user?.id && (
                      <Badge variant="warning">Shared</Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Your tasks</span>
                      <span className="font-medium tabular-nums">
                        {project.completed_tasks}/{project.total_tasks}
                      </span>
                    </div>
                    <ProgressBar value={project.completed_tasks} max={project.total_tasks || 1} className="h-1" />
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/8">
                    <Avatar src={profile?.avatar_url} name={profile?.display_name ?? 'You'} size="sm" />
                    <span className="text-xs text-muted truncate">{profile?.display_name ?? 'You'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <ul>
            {filtered.map((project) => (
              <li key={project.id} className="border-b border-white/[0.06] last:border-b-0">
                <Link
                  to={`/projects/${project.slug}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  <ProjectLogoThumb name={project.name} logoUrl={project.logo_url} className="h-9 w-9 rounded-lg text-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground font-display">{project.name}</p>
                    <p className="text-[11px] text-muted mt-0.5 tabular-nums">
                      {project.completed_tasks}/{project.total_tasks} tasks done
                    </p>
                  </div>
                  {project.user_id !== user?.id && <Badge variant="warning">Shared</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </PageShell>
  )
}
