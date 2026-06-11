import { useEffect, useState } from 'react'
import { HiOutlineUserAdd, HiOutlineX } from 'react-icons/hi'
import { useShareableUsers, useProjectMembers } from '@/hooks/useProjectMembers'
import { useProjects } from '@/hooks/useProjects'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'

export function ProjectSharingSettings() {
  const { user } = useAuth()
  const { data: projects = [] } = useProjects()
  const { data: shareableUsers = [] } = useShareableUsers()
  const ownedProjects = projects.filter((p) => p.user_id === user?.id)

  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (ownedProjects.length === 0) {
      setSelectedProjectId('')
      return
    }
    if (!ownedProjects.some((p) => p.id === selectedProjectId)) {
      setSelectedProjectId(ownedProjects[0].id)
    }
  }, [ownedProjects, selectedProjectId])

  const { data: members = [], addMember, removeMember } = useProjectMembers(
    selectedProjectId || undefined,
    !!selectedProjectId
  )

  const memberUserIds = new Set(members.map((m) => m.user_id))
  const available = shareableUsers.filter((u) => !memberUserIds.has(u.id))

  const handleAdd = async () => {
    if (!selectedUserId) return
    setError('')
    try {
      await addMember.mutateAsync(selectedUserId)
      setSelectedUserId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share project')
    }
  }

  if (ownedProjects.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share projects</CardTitle>
        <CardDescription>
          Invite collaborators to a project. They will only see their own tasks on it, not yours.
        </CardDescription>
      </CardHeader>

      <label className="block text-sm font-medium text-foreground mb-1.5">Project</label>
      <select
        value={selectedProjectId}
        onChange={(e) => {
          setSelectedProjectId(e.target.value)
          setSelectedUserId('')
          setError('')
        }}
        className="w-full glass-inset px-3 py-2 text-sm mb-4"
      >
        {ownedProjects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {shareableUsers.length === 0 ? (
        <p className="text-sm text-muted">No other users to share with yet. Create a collaborator in Team above.</p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1 glass-inset px-3 py-2 text-sm"
          >
            <option value="">Select user...</option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name ?? u.email}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            disabled={!selectedUserId || addMember.isPending || available.length === 0}
            onClick={handleAdd}
            className="min-h-[44px] sm:min-h-0"
          >
            <HiOutlineUserAdd className="h-4 w-4" />
            Share
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="space-y-2">
        {members.length === 0 ? (
          <p className="text-sm text-muted">This project is private. Only you can see it.</p>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 glass-inset px-3 py-2"
            >
              <Avatar
                src={member.profile?.avatar_url}
                name={member.profile?.display_name ?? member.profile?.email ?? 'User'}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {member.profile?.display_name ?? 'User'}
                </p>
                <p className="text-xs text-muted truncate">{member.profile?.email}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={removeMember.isPending}
                onClick={() => removeMember.mutate(member.id)}
                aria-label="Remove access"
              >
                <HiOutlineX className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
