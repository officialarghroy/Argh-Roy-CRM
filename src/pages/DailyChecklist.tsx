import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { addDays, subDays } from 'date-fns'
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineDotsHorizontal,
  HiOutlineRefresh,
} from 'react-icons/hi'
import { Header } from '@/components/layout/Header'
import { usePageLayout } from '@/hooks/usePageLayout'
import { useChecklist } from '@/hooks/useChecklist'
import { useChecklistDayRollover } from '@/hooks/useChecklistDayRollover'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { isOverdue } from '@/lib/recurrence'
import { formatChecklistDateLabel, getChecklistDate } from '@/lib/checklistDay'
import { useToast } from '@/contexts/ToastContext'
import type { DailyChecklistItem } from '@/types/database'

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
    <div className="glass-card p-0">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/12">
        <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-8 w-8 items-center justify-center rounded-lg border-0 text-foreground/80 outline-none transition-colors hover:bg-white/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-white/20"
          aria-label={`Add to ${title}`}
        >
          <HiOutlinePlus className="h-5 w-5" />
        </button>
      </div>

      {showAddInput && (
        <form onSubmit={onAddSubmit} className="px-5 py-3 border-b border-white/12 bg-white/[0.02]">
          <Input
            autoFocus
            placeholder={addPlaceholder}
            value={addValue}
            onChange={(e) => onAddChange(e.target.value)}
            className="border-white/10 bg-black/20"
          />
        </form>
      )}

      {children}
    </div>
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

function ChecklistItemRow({
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

  return (
    <li className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
      <button
        type="button"
        onClick={onToggle}
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

      <ChecklistRowMenu
        isDaily={isDaily}
        onMakeDaily={onMakeDaily}
        onRemoveDaily={onRemoveDaily}
        onDelete={onDelete}
      />
    </li>
  )
}

export function DailyChecklist() {
  const { openSidebar } = usePageLayout()
  const [date, setDate] = useState(getChecklistDate)
  const [newItem, setNewItem] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const toast = useToast()
  const {
    data: items = [],
    isLoading,
    addItem,
    toggleItem,
    deleteItem,
    makeDaily,
    removeDaily,
    refetch,
  } = useChecklist(date)

  const handleDayRollover = useCallback(() => {
    setDate(getChecklistDate())
    void refetch()
  }, [refetch])

  useChecklistDayRollover(handleDayRollover)

  const completed = items.filter((i) => i.completed).length
  const total = items.length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

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
    <div className="flex flex-col flex-1">
      <Header
        title="Daily Checklist"
        subtitle="Add items for today. Mark any item to repeat every day."
        onMenuClick={openSidebar}
        onRefresh={() => refetch()}
      />

      <div className="flex-1 p-4 lg:p-6 space-y-5 max-w-2xl mx-auto w-full">
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

          <div className="relative h-11 w-11 shrink-0">
            <svg className="h-11 w-11 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className="text-white/10" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="currentColor"
                className="text-emerald-400"
                strokeWidth="3"
                strokeDasharray={`${percent} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-foreground">
              {completed}/{total}
            </span>
          </div>
        </div>

        <ChecklistGlassCard
          title="Daily Checklist"
          onAdd={() => setShowAddItem((v) => !v)}
          showAddInput={showAddItem}
          addPlaceholder="Add a checklist item..."
          addValue={newItem}
          onAddChange={setNewItem}
          onAddSubmit={handleAdd}
        >
          {isLoading ? (
            <div className="px-5 py-10 text-center text-muted text-sm">Loading...</div>
          ) : items.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted text-sm">
              No items yet. Tap + to add one.
            </div>
          ) : (
            <ul>
              {items.map((item) => (
                <ChecklistItemRow
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
          )}
        </ChecklistGlassCard>
      </div>
    </div>
  )
}
