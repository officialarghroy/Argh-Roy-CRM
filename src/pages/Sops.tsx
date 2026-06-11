import { useState } from 'react'
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil } from 'react-icons/hi'
import { Header } from '@/components/layout/Header'
import { usePageLayout } from '@/hooks/usePageLayout'
import { useSops } from '@/hooks/useSops'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

export function Sops() {
  const { openSidebar } = usePageLayout()
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const { data: sops = [], isLoading, addSop, updateSop, deleteSop, refetch } = useSops()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    await addSop.mutateAsync({ title: newTitle.trim() })
    setNewTitle('')
    setShowNew(false)
  }

  const startEdit = (id: string, content: string | null) => {
    setEditingId(id)
    setEditContent(content ?? '')
  }

  const saveEdit = async (id: string) => {
    await updateSop.mutateAsync({ id, content: editContent })
    setEditingId(null)
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="SOPs"
        subtitle="Standard operating procedures for your workflows"
        onMenuClick={openSidebar}
        onRefresh={() => refetch()}
        actions={
          <Button size="sm" onClick={() => setShowNew(true)} aria-label="New SOP">
            <HiOutlinePlus className="h-4 w-4" />
            <span className="hidden sm:inline">New SOP</span>
          </Button>
        }
      />

      <div className="flex-1 p-4 lg:p-6 space-y-4 max-w-3xl">
        {showNew && (
          <Card>
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="SOP title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={!newTitle.trim()} className="flex-1 sm:flex-none min-h-[44px]">Create</Button>
                <Button type="button" variant="ghost" onClick={() => setShowNew(false)} className="flex-1 sm:flex-none min-h-[44px]">Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center text-muted py-12">Loading SOPs...</div>
        ) : sops.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-muted mb-4">No SOPs yet. Document your processes here.</p>
            <Button onClick={() => setShowNew(true)}>
              <HiOutlinePlus className="h-4 w-4" />
              Create first SOP
            </Button>
          </Card>
        ) : (
          sops.map((sop) => (
            <Card key={sop.id}>
              <CardHeader className="flex flex-row items-center justify-between mb-2">
                <CardTitle className="text-base">{sop.title}</CardTitle>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(sop.id, sop.content)}
                    className="p-1.5 text-muted hover:text-foreground rounded"
                  >
                    <HiOutlinePencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteSop.mutate(sop.id)}
                    className="p-1.5 text-muted hover:text-danger rounded"
                  >
                    <HiOutlineTrash className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              {editingId === sop.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={8}
                    className="w-full glass-inset px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                    placeholder="Write your SOP content in markdown..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(sop.id)}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted whitespace-pre-wrap">
                  {sop.content || 'No content yet. Click edit to add.'}
                </p>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
