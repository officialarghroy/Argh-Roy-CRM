import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HiOutlineSearch, HiOutlinePlus, HiOutlineViewGrid, HiOutlineViewList } from 'react-icons/hi'
import { Header } from '@/components/layout/Header'
import { usePageLayout } from '@/hooks/usePageLayout'
import { useProjects } from '@/hooks/useProjects'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Avatar } from '@/components/ui/Avatar'
import { ProjectLogoPicker } from '@/components/projects/ProjectLogoPicker'
import { uploadProjectLogo } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'

function ProjectLogoThumb({ name, logoUrl, className }: { name: string; logoUrl: string | null; className?: string }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" className={cn('object-cover shrink-0', className)} />
  }
  return (
    <div className={cn('bg-accent/20 text-accent flex items-center justify-center font-bold shrink-0', className)}>
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
    <div className="flex flex-col flex-1">
      <Header
        title="Projects"
        onMenuClick={openSidebar}
        onRefresh={() => refetch()}
        actions={
          isAdmin ? (
            <Button size="sm" onClick={() => setShowNew(true)} aria-label="New project">
              <HiOutlinePlus className="h-4 w-4" />
              <span className="hidden sm:inline">New project</span>
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 p-4 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-inset pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">{filtered.length} projects</span>
            <div className="flex glass-pill overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={cn('p-2', view === 'grid' ? 'bg-white/10 text-foreground' : 'text-muted hover:bg-white/5')}
              >
                <HiOutlineViewGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={cn('p-2', view === 'list' ? 'bg-white/10 text-foreground' : 'text-muted hover:bg-white/5')}
              >
                <HiOutlineViewList className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {isAdmin && showNew && (
          <Card>
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
                  <Button type="button" variant="ghost" onClick={resetNewProjectForm} className="flex-1 sm:flex-none min-h-[44px]">Cancel</Button>
                </div>
              </div>
            </form>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center text-muted py-12">Loading projects...</div>
        ) : filtered.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-muted mb-4">No projects yet</p>
            <Button onClick={() => setShowNew(true)}>
              <HiOutlinePlus className="h-4 w-4" />
              Create your first project
            </Button>
          </Card>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <Link key={project.id} to={`/projects/${project.slug}`}>
                <Card className="hover:border-accent/50 transition-colors cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <ProjectLogoThumb name={project.name} logoUrl={project.logo_url} className="h-10 w-10 rounded-lg" />
                      <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
                    </div>
                    {project.user_id !== user?.id && (
                      <Badge variant="warning">Shared with you</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Your tasks</span>
                      <span className="font-medium text-foreground">
                        {project.completed_tasks} / {project.total_tasks}
                      </span>
                    </div>
                    <ProgressBar value={project.completed_tasks} max={project.total_tasks || 1} />
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                    <Avatar
                      src={profile?.avatar_url}
                      name={profile?.display_name ?? 'You'}
                      size="sm"
                    />
                    <span className="text-xs text-muted">{profile?.display_name ?? 'You'}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((project) => (
              <Link key={project.id} to={`/projects/${project.slug}`}>
                <Card className="flex items-center gap-4 hover:border-accent/50 transition-colors py-3">
                  <ProjectLogoThumb name={project.name} logoUrl={project.logo_url} className="h-8 w-8 rounded-lg text-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{project.name}</p>
                    <p className="text-xs text-muted">{project.completed_tasks}/{project.total_tasks} tasks done</p>
                  </div>
                  {project.user_id !== user?.id && (
                    <Badge variant="warning">Shared</Badge>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
