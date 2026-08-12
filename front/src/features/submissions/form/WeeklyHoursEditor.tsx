import type { DayHours } from '@/types/submission'
import { WEEKDAY_LABELS } from '../existingResource/emptyState'
import { TimeSelect } from './TimeSelect'
import { cn } from '@/utils/cn'

interface WeeklyHoursEditorProps {
  hours: DayHours[]
  onChange: (hours: DayHours[]) => void
  error?: string
}

function dayTimeRangeState(day: DayHours): {
  incompletePair: boolean
  invalidOrder: boolean
} {
  const opensAt = day.opensAt.trim()
  const closesAt = day.closesAt.trim()
  const hasOpen = Boolean(opensAt)
  const hasClose = Boolean(closesAt)
  return {
    incompletePair: hasOpen !== hasClose,
    invalidOrder: hasOpen && hasClose && opensAt >= closesAt,
  }
}

export function WeeklyHoursEditor({
  hours,
  onChange,
  error,
}: WeeklyHoursEditorProps) {
  const updateDay = (dayOfWeek: number, patch: Partial<DayHours>) => {
    onChange(
      hours.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day,
      ),
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Weekly hours</p>
      <ul className="space-y-2">
        {hours.map((day) => {
          const { incompletePair, invalidOrder } = dayTimeRangeState(day)
          const opensInvalid = incompletePair
          const closesInvalid = incompletePair || invalidOrder

          return (
            <li
              key={day.dayOfWeek}
              className="grid gap-2 rounded-lg border border-border-subtle p-3 sm:grid-cols-[7rem_1fr]"
            >
              <p className="text-sm font-medium text-foreground">
                {WEEKDAY_LABELS[day.dayOfWeek]}
              </p>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={day.isClosed}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, {
                          isClosed: e.target.checked,
                          byAppointment: e.target.checked
                            ? false
                            : day.byAppointment,
                        })
                      }
                      className="rounded border-border"
                    />
                    Closed
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={day.byAppointment}
                      disabled={day.isClosed}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, {
                          byAppointment: e.target.checked,
                        })
                      }
                      className="rounded border-border"
                    />
                    By appointment
                  </label>
                </div>
                {!day.isClosed && !day.byAppointment ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <TimeSelect
                      value={day.opensAt}
                      onChange={(opensAt) =>
                        updateDay(day.dayOfWeek, { opensAt })
                      }
                      aria-label={`${WEEKDAY_LABELS[day.dayOfWeek]} opens`}
                      aria-invalid={opensInvalid || undefined}
                      className={cn(
                        'w-auto min-w-[8.5rem]',
                        opensInvalid && 'border-danger',
                      )}
                      placeholder="Opens"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <TimeSelect
                      value={day.closesAt}
                      onChange={(closesAt) =>
                        updateDay(day.dayOfWeek, { closesAt })
                      }
                      aria-label={`${WEEKDAY_LABELS[day.dayOfWeek]} closes`}
                      aria-invalid={closesInvalid || undefined}
                      className={cn(
                        'w-auto min-w-[8.5rem]',
                        closesInvalid && 'border-danger',
                      )}
                      placeholder="Closes"
                    />
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
