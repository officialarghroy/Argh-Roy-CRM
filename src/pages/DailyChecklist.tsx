import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { addDays, subDays } from 'date-fns'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineDotsHorizontal,
  HiOutlineRefresh,
} from 'react-icons/hi'
import { PageShell } from '@/components/layout/PageShell'
import { usePageLayout } from '@/hooks/usePageLayout'
import { useChecklist } from '@/hooks/useChecklist'
import { useChecklistDayRollover } from '@/hooks/useChecklistDayRollover'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { EmptyState } from '@/components/ui/ListPrimitives'
import { cn } from '@/lib/utils'
import { isOverdue } from '@/lib/recurrence'
import { formatChecklistDateLabel, getChecklistDate } from '@/lib/checklistDay'
import { useToast } from '@/contexts/ToastContext'
import { formatSupabaseError } from '@/lib/checklistMode'
import type { ChecklistMode, DailyChecklistItem } from '@/types/database'

export interface ChecklistPageConfig {
  mode?: ChecklistMode
  pageTitle: string
  subtitle: string
  cardTitle: string
  addPlaceholder: string
}

function ChecklistGlassCard({
  title,
  onAdd,
  showAddInput,
  addPlaceholder,
  addValue,
  onAddChange,
  onAddSubmit,
  children,
}: {
  title: string
  onAdd: () => void
  showAddInput: boolean
  addPlaceholder: string
  addValue: string
  onAddChange: (value: string) => void
  onAddSubmit: (e: React.FormEvent) => void
  children: React.ReactNode
}) {
  return (
    <GlassPanel
      title={title}
      action={
        <button
          type="button"
          onClick={onAdd}
          className="flex h-8 w-8 items-center justify-center rounded-lg border-0 text-foreground/80 outline-none transition-colors hover:bg-white/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-white/20"
          aria-label={`Add to ${title}`}
        >
          <HiOutlinePlus className="h-5 w-5" />
        </button>
      }
      toolbar={
        showAddInput ? (
          <form onSubmit={onAddSubmit}>
            <Input
              autoFocus
              placeholder={addPlaceholder}
              value={addValue}
              onChange={(e) => onAddChange(e.target.value)}
              className="border-white/10 bg-black/20"
            />
          </form>
        ) : undefined
      }
    >
      {children}
    </GlassPanel>
  )
}

function ChecklistRowMenu({
  isDaily,
  onMakeDaily,
  onRemoveDaily,
  onDelete,
}: {
  isDaily: boolean
  onMakeDaily: () => void
  onRemoveDaily: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    const menuWidth = 180
    const left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)
    setMenuPos({ top: rect.bottom + 4, left: Math.max(8, left) })
  }, [])

  useEffect(() => {
    if (!open) return
    updateMenuPosition()

    const close = (e: Event) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }

    const onScrollOrResize = () => updateMenuPosition()

    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, updateMenuPosition])

  const menu = open ? (
    <div
      ref={menuRef}
      style={{ top: menuPos.top, left: menuPos.left }}
      className="fixed z-[100] min-w-[180px] rounded-lg border border-white/10 bg-[#141c28] py-1 shadow-xl"
    >
      {isDaily ? (
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            onRemoveDaily()
          }}
          className="flex w-full items-center gap-2 border-0 px-3 py-2 text-sm text-foreground hover:bg-white/5"
        >
          <HiOutlineRefresh className="h-4 w-4 text-muted" />
          Remove from daily
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            onMakeDaily()
          }}
          className="flex w-full items-center gap-2 border-0 px-3 py-2 text-sm text-foreground hover:bg-white/5"
        >
          <HiOutlineRefresh className="h-4 w-4 text-emerald-400" />
          Repeat every day
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setOpen(false)
          onDelete()
        }}
        className="flex w-full items-center gap-2 border-0 px-3 py-2 text-sm text-danger hover:bg-white/5"
      >
        <HiOutlineTrash className="h-4 w-4" />
        Delete
      </button>
    </div>
  ) : null

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!open) updateMenuPosition()
          setOpen((v) => !v)
        }}
        className="flex h-9 w-9 items-center justify-center rounded-lg border-0 bg-white/5 text-muted outline-none transition-colors hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-white/20"
        aria-label="Task options"
        aria-expanded={open}
      >
        <HiOutlineDotsHorizontal className="h-5 w-5" />
      </button>
      {menu && createPortal(menu, document.body)}
    </div>
  )
}

function SortableChecklistItemRow({
  item,
  onToggle,
  onMakeDaily,
  onRemoveDaily,
  onDelete,
}: {
  item: DailyChecklistItem
  onToggle: () => void
  onMakeDaily: () => void
  onRemoveDaily: () => void
  onDelete: () => void
}) {
  const overdue = isOverdue(item.scheduled_at, item.completed)
  const isDaily = Boolean(item.template_id)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-grab active:cursor-grabbing touch-none',
        isDragging && 'relative z-10 opacity-60 bg-white/[0.04]'
      )}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        onClick={onToggle}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          'h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
          item.completed
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : overdue
              ? 'border-danger/70 hover:border-danger'
              : 'border-amber-400/60 hover:border-amber-400'
        )}
        aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {item.completed && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-bold uppercase tracking-wide truncate',
            item.completed ? 'text-muted line-through' : 'text-foreground'
          )}
        >
          {item.title}
        </p>
        {(overdue && !item.completed) || isDaily ? (
          <div className="mt-1 flex items-center gap-1.5">
            {overdue && !item.completed ? (
              <span className="text-xs font-medium text-warning">Overdue</span>
            ) : isDaily ? (
              <>
                <HiOutlineRefresh className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Daily</span>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div onPointerDown={(e) => e.stopPropagation()}>
        <ChecklistRowMenu
          isDaily={isDaily}
          onMakeDaily={onMakeDaily}
          onRemoveDaily={onRemoveDaily}
          onDelete={onDelete}
        />
      </div>
    </li>
  )
}

export function ChecklistPage({
  mode = 'daily',
  pageTitle,
  subtitle,
  cardTitle,
  addPlaceholder,
}: ChecklistPageConfig) {
  const { openSidebar } = usePageLayout()
  const [date, setDate] = useState(getChecklistDate)
  const [newItem, setNewItem] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const toast = useToast()
  const {
    data: items = [],
    isLoading,
    isError,
    error,
    addItem,
    toggleItem,
    deleteItem,
    makeDaily,
    removeDaily,
    reorderItems,
    refetch,
  } = useChecklist(date, mode)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const orderedIds = arrayMove(
        items.map((i) => i.id),
        oldIndex,
        newIndex
      )
      reorderItems.mutate(orderedIds)
    },
    [items, reorderItems]
  )

  const handleDayRollover = useCallback(() => {
    setDate(getChecklistDate())
    void refetch()
  }, [refetch])

  useChecklistDayRollover(handleDayRollover)

  const completed = items.filter((i) => i.completed).length
  const total = items.length

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.trim()) return
    try {
      await addItem.mutateAsync(newItem.trim())
      setNewItem('')
      setShowAddItem(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add item')
    }
  }

  return (
    <PageShell
      title={pageTitle}
      subtitle={subtitle}
      onMenuClick={openSidebar}
      onRefresh={() => refetch()}
      maxWidth="2xl"
      stats={
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 glass-pill p-1">
            <Button variant="ghost" size="sm" onClick={() => setDate(subDays(date, 1))}>
              <HiOutlineChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs sm:text-sm font-medium text-foreground min-w-0 sm:min-w-[120px] text-center px-1 sm:px-2 truncate max-w-[140px] sm:max-w-none">
              {formatChecklistDateLabel(date)}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setDate(addDays(date, 1))}>
              <HiOutlineChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <ProgressRing done={completed} total={total || 1} />
        </div>
      }
    >
      <ChecklistGlassCard
          title={cardTitle}
          onAdd={() => setShowAddItem((v) => !v)}
          showAddInput={showAddItem}
          addPlaceholder={addPlaceholder}
          addValue={newItem}
          onAddChange={setNewItem}
          onAddSubmit={handleAdd}
        >
          {isLoading ? (
            <EmptyState message="Loading..." />
          ) : isError ? (
            <div className="px-5 py-10 text-center space-y-2">
              <p className="text-sm text-danger">Could not load checklist</p>
              <p className="text-xs text-muted">{formatSupabaseError(error)}</p>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>Try again</Button>
            </div>
          ) : items.length === 0 ? (
            <EmptyState message="No items yet. Tap + to add one." />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <ul>
                  {items.map((item) => (
                    <SortableChecklistItemRow
                      key={item.id}
                      item={item}
                      onToggle={() =>
                        toggleItem.mutate({ id: item.id, completed: !item.completed, title: item.title })
                      }
                      onMakeDaily={() => {
                        makeDaily.mutate(item, {
                          onSuccess: () => toast.success('Repeats every day'),
                          onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update'),
                        })
                      }}
                      onRemoveDaily={() => {
                        removeDaily.mutate(item, {
                          onSuccess: () => toast.success('Removed from daily'),
                          onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update'),
                        })
                      }}
                      onDelete={() => {
                        deleteItem.mutate(item.id, {
                          onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete'),
                        })
                      }}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </ChecklistGlassCard>
    </PageShell>
  )
}

export function DailyChecklist() {
  return (
    <ChecklistPage
      pageTitle="Daily Checklist"
      subtitle="Add items for today. Mark any item to repeat every day."
      cardTitle="Daily Checklist"
      addPlaceholder="Add a checklist item..."
    />
  )
}
