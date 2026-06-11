import { useState } from 'react'
import { HiOutlineUserAdd } from 'react-icons/hi'
import { useCollaborators } from '@/hooks/useProjectMembers'
import { createCollaboratorUser } from '@/lib/adminUsers'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'

interface TeamSettingsProps {
  onMessage: (msg: string) => void
}

export function TeamSettings({ onMessage }: TeamSettingsProps) {
  const { data: collaborators = [], refetch, isLoading } = useCollaborators()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      await createCollaboratorUser({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
      })
      setEmail('')
      setPassword('')
      setDisplayName('')
      await refetch()
      onMessage('Collaborator account created')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>
          Create collaborator accounts. They can sign in with the email and password you set, then you assign them to projects.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleCreate} className="space-y-4 mb-6">
        <Input
          id="teamEmail"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="collaborator@example.com"
          required
        />
        <Input
          id="teamPassword"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          required
          minLength={6}
        />
        <Input
          id="teamDisplayName"
          label="Display name (optional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Team member name"
        />

        {error && (
          <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <Button type="submit" disabled={creating}>
          <HiOutlineUserAdd className="h-4 w-4" />
          {creating ? 'Creating...' : 'Create collaborator'}
        </Button>
      </form>

      <div className="border-t border-white/10 pt-4 space-y-2">
        <p className="text-sm font-medium text-foreground">Collaborators</p>
        {isLoading ? (
          <p className="text-sm text-muted">Loading...</p>
        ) : collaborators.length === 0 ? (
          <p className="text-sm text-muted">No collaborators yet.</p>
        ) : (
          collaborators.map((c) => (
            <div key={c.id} className="flex items-center gap-3 glass-inset px-3 py-2">
              <Avatar src={c.avatar_url} name={c.display_name ?? c.email ?? 'User'} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.display_name ?? 'Collaborator'}</p>
                <p className="text-xs text-muted truncate">{c.email}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
