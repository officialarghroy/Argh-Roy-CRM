import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'
import {
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineClock,
} from 'react-icons/hi'
import { Header } from '@/components/layout/Header'
import { usePageLayout } from '@/hooks/usePageLayout'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from '@/types/database'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function eventColor(event: CalendarEvent) {
  if (event.overdue) return 'bg-danger'
  if (event.type === 'checklist') return 'bg-purple-500'
  if (event.status === 'done' || event.completed) return 'bg-success'
  return 'bg-accent'
}

function eventLabel(event: CalendarEvent) {
  if (event.overdue) return 'Overdue'
  if (event.status === 'done' || event.completed) return 'Done'
  if (event.type === 'checklist') return 'Habit'
  return 'Task'
}

export function Calendar() {
  const { openSidebar } = usePageLayout()
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const { data: events = [], refetch } = useCalendarEvents(viewDate)

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate))
    const end = endOfWeek(endOfMonth(viewDate))
    return eachDayOfInterval({ start, end })
  }, [viewDate])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const key = format(event.start, 'yyyy-MM-dd')
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start.getTime() - b.start.getTime())
    }
    return map
  }, [events])

  const selectedKey = format(selectedDate, 'yyyy-MM-dd')
  const selectedEvents = eventsByDay.get(selectedKey) ?? []

  const goToday = () => {
    const now = new Date()
    setViewDate(now)
    setSelectedDate(now)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header
        title="Calendar"
        subtitle="Scheduled tasks and daily habits"
        onMenuClick={openSidebar}
        onRefresh={() => refetch()}
      />

      <div className="flex-1 p-4 lg:p-6 min-h-0 max-w-5xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 h-full">
          {/* Month grid */}
          <div className="glass-card flex-1 overflow-hidden p-0">
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-white/12">
              <button
                type="button"
                onClick={() => setViewDate(subMonths(viewDate, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-foreground transition-colors"
                aria-label="Previous month"
              >
                <HiOutlineChevronLeft className="h-5 w-5" />
              </button>

              <div className="text-center">
                <h2 className="text-base sm:text-lg font-semibold text-foreground">
                  {format(viewDate, 'MMMM yyyy')}
                </h2>
                <button
                  type="button"
                  onClick={goToday}
                  className="mt-0.5 text-xs font-medium text-accent hover:underline"
                >
                  Today
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewDate(addMonths(viewDate, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-foreground transition-colors"
                aria-label="Next month"
              >
                <HiOutlineChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-white/12">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted"
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.charAt(0)}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthDays.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const dayEvents = eventsByDay.get(key) ?? []
                const selected = isSameDay(day, selectedDate)
                const today = isToday(day)
                const inMonth = isSameMonth(day, viewDate)

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'relative flex flex-col items-center min-h-[52px] sm:min-h-[72px] p-1.5 sm:p-2 border-b border-r border-white/12 transition-colors',
                      !inMonth && 'opacity-40',
                      selected ? 'bg-accent/15' : 'hover:bg-white/[0.03]'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                        today && 'bg-accent text-white',
                        !today && selected && 'text-accent',
                        !today && !selected && 'text-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    {dayEvents.length > 0 && (
                      <div className="mt-1 flex items-center justify-center gap-0.5 flex-wrap max-w-full">
                        {dayEvents.slice(0, 3).map((event) => (
                          <span
                            key={event.id}
                            className={cn('h-1.5 w-1.5 rounded-full shrink-0', eventColor(event))}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] text-muted leading-none">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Day agenda */}
          <div className="glass-card w-full lg:w-80 xl:w-96 shrink-0 overflow-hidden p-0 flex flex-col max-h-[420px] lg:max-h-none lg:min-h-[480px]">
            <div className="px-5 py-4 border-b border-white/12">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
              </p>
              <h3 className="text-lg font-semibold text-foreground mt-0.5">
                {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              <p className="text-xs text-muted mt-1">
                {selectedEvents.length === 0
                  ? 'Nothing scheduled'
                  : `${selectedEvents.length} item${selectedEvents.length === 1 ? '' : 's'}`}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {selectedEvents.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-muted">No events this day.</p>
                  <Link
                    to="/tasks"
                    className="inline-block mt-3 text-sm font-medium text-accent hover:underline"
                  >
                    Add a scheduled task
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-white/12">
                  {selectedEvents.map((event) => (
                    <li key={event.id} className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5 shrink-0">
                          <span className={cn('block h-2 w-2 rounded-full mt-1.5', eventColor(event))} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                            <span className="inline-flex items-center gap-1 text-xs text-muted">
                              <HiOutlineClock className="h-3.5 w-3.5" />
                              {format(event.start, 'h:mm a')}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded',
                                event.type === 'checklist' && 'bg-purple-500/15 text-purple-400',
                                event.overdue && 'bg-danger/15 text-danger',
                                !event.overdue && event.type === 'task' && event.status !== 'done' && 'bg-accent/15 text-accent',
                                event.status === 'done' || event.completed ? 'bg-success/15 text-success' : ''
                              )}
                            >
                              {eventLabel(event)}
                            </span>
                          </div>
                          {event.projectName && (
                            <p className="text-xs text-muted mt-1 truncate">{event.projectName}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-5 py-3 border-t border-white/12 flex flex-wrap gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" /> Task
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-500" /> Habit
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-danger" /> Overdue
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
