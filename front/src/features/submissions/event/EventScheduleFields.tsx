import { useState, type FocusEvent } from 'react'
import { Input } from '@/components/ui'
import type {
  EventContributionData,
  EventFrequency,
  EventScheduleKind,
  EventWeekday,
} from '@/types/submission'
import { EVENT_WEEKDAY_OPTIONS } from '@/features/submissions/mappers/eventRecurrence'
import {
  getEndDateOrderError,
  getEndTimeOrderError,
  type EventFieldErrors,
} from './validation'
import { CheckboxOptionGroup } from '../form/CheckboxOptionGroup'
import { Field } from '../form/Field'
import { OptionCardGroup } from '../form/OptionCardGroup'
import { TimeSelect } from '../form/TimeSelect'

interface EventScheduleFieldsProps {
  data: EventContributionData
  onChange: (partial: Partial<EventContributionData>) => void
  errors: EventFieldErrors
  /** When true (Save/Continue), force-show schedule order errors. */
  showErrors?: boolean
}

const SCHEDULE_KIND_OPTIONS: {
  value: EventScheduleKind
  label: string
}[] = [
  { value: 'one_time', label: 'One-time' },
  { value: 'recurring', label: 'Recurring' },
]

const FREQUENCY_OPTIONS: { value: EventFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
]

type ScheduleOrderField =
  | 'startDate'
  | 'endDate'
  | 'startTime'
  | 'endTime'

function needsWeekdays(frequency: EventFrequency | null): boolean {
  return frequency === 'weekly' || frequency === 'biweekly'
}

export function EventScheduleFields({
  data,
  onChange,
  errors,
  showErrors = false,
}: EventScheduleFieldsProps) {
  const [scheduleOrderTouched, setScheduleOrderTouched] = useState(false)
  /** UI-only: same-day end is the common case; not part of the submission payload. */
  const [endsSameDay, setEndsSameDay] = useState(() => {
    if (
      data.scheduleKind === 'one_time' &&
      data.startDate &&
      data.endDate &&
      data.endDate !== data.startDate
    ) {
      return false
    }
    return true
  })

  const markScheduleOrderTouched = () => {
    setScheduleOrderTouched(true)
  }

  const handleScheduleOrderChange = (
    field: ScheduleOrderField,
    value: string,
  ) => {
    onChange({ [field]: value })
    markScheduleOrderTouched()
  }

  const handleOneTimeStartDateChange = (startDate: string) => {
    if (endsSameDay) {
      onChange({ startDate, endDate: startDate })
      markScheduleOrderTouched()
      return
    }
    handleScheduleOrderChange('startDate', startDate)
  }

  const handleEndsSameDayChange = (checked: boolean) => {
    setEndsSameDay(checked)
    if (checked && data.startDate) {
      onChange({ endDate: data.startDate })
      markScheduleOrderTouched()
    }
  }

  const handleSectionFocusOut = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    markScheduleOrderTouched()
  }

  const showScheduleOrderErrors = showErrors || scheduleOrderTouched
  const endDateOrderError = showScheduleOrderErrors
    ? getEndDateOrderError(data)
    : undefined
  const endTimeOrderError = showScheduleOrderErrors
    ? getEndTimeOrderError(data)
    : undefined

  const endDateError = endDateOrderError ?? errors.endDate
  const endTimeError = endTimeOrderError ?? errors.endTime

  const frequencyOptions =
    data.frequency === 'other'
      ? [...FREQUENCY_OPTIONS, { value: 'other' as const, label: 'Other' }]
      : FREQUENCY_OPTIONS

  return (
    <div className="space-y-4" onBlur={handleSectionFocusOut}>
      <OptionCardGroup<EventScheduleKind>
        name="event-schedule-kind"
        legend="Is this event:"
        options={SCHEDULE_KIND_OPTIONS}
        value={data.scheduleKind}
        onChange={(scheduleKind) => {
          if (scheduleKind === 'one_time' && endsSameDay && data.startDate) {
            onChange({ scheduleKind, endDate: data.startDate })
            return
          }
          onChange({ scheduleKind })
        }}
        error={errors.scheduleKind}
      />

      {data.scheduleKind === 'one_time' ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              id="event-start-date"
              label="Start date"
              required
              error={errors.startDate}
            >
              <Input
                id="event-start-date"
                type="date"
                value={data.startDate}
                onChange={(e) => handleOneTimeStartDateChange(e.target.value)}
                onBlur={markScheduleOrderTouched}
              />
            </Field>
            <Field
              id="event-start-time"
              label="Start time"
              required
              error={errors.startTime}
            >
              <TimeSelect
                id="event-start-time"
                value={data.startTime}
                onChange={(startTime) =>
                  handleScheduleOrderChange('startTime', startTime)
                }
                onBlur={markScheduleOrderTouched}
              />
            </Field>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input
              id="event-ends-same-day"
              type="checkbox"
              checked={endsSameDay}
              onChange={(e) => handleEndsSameDayChange(e.target.checked)}
              className="rounded border-border"
            />
            Ends the same day
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="event-end-date" label="End date" error={endDateError}>
              <Input
                id="event-end-date"
                type="date"
                value={data.endDate}
                disabled={endsSameDay}
                readOnly={endsSameDay}
                onChange={(e) =>
                  handleScheduleOrderChange('endDate', e.target.value)
                }
                onBlur={markScheduleOrderTouched}
              />
            </Field>
            <Field id="event-end-time" label="End time" error={endTimeError}>
              <TimeSelect
                id="event-end-time"
                value={data.endTime}
                onChange={(endTime) =>
                  handleScheduleOrderChange('endTime', endTime)
                }
                onBlur={markScheduleOrderTouched}
              />
            </Field>
          </div>
        </div>
      ) : null}

      {data.scheduleKind === 'recurring' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              id="event-first-date"
              label="First occurrence date"
              required
              error={errors.startDate}
            >
              <Input
                id="event-first-date"
                type="date"
                value={data.startDate}
                onChange={(e) => onChange({ startDate: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              id="event-recurring-start-time"
              label="Start time"
              required
              error={errors.startTime}
            >
              <TimeSelect
                id="event-recurring-start-time"
                value={data.startTime}
                onChange={(startTime) =>
                  handleScheduleOrderChange('startTime', startTime)
                }
                onBlur={markScheduleOrderTouched}
              />
            </Field>
            <Field
              id="event-recurring-end-time"
              label="End time"
              error={endTimeError}
            >
              <TimeSelect
                id="event-recurring-end-time"
                value={data.endTime}
                onChange={(endTime) =>
                  handleScheduleOrderChange('endTime', endTime)
                }
                onBlur={markScheduleOrderTouched}
              />
            </Field>
          </div>

          <OptionCardGroup<EventFrequency>
            name="event-frequency"
            legend="Frequency"
            options={frequencyOptions}
            value={data.frequency}
            onChange={(frequency) =>
              onChange({
                frequency,
                ...(needsWeekdays(frequency)
                  ? {}
                  : { recurrenceWeekdays: [] }),
              })
            }
            error={errors.frequency}
          />

          {data.frequency === 'other' ? (
            <Field
              id="event-frequency-other"
              label="Describe the schedule"
              required
              error={errors.frequencyOther}
            >
              <Input
                id="event-frequency-other"
                value={data.frequencyOther}
                onChange={(e) => onChange({ frequencyOther: e.target.value })}
                placeholder="e.g. First Tuesday of each month"
              />
            </Field>
          ) : null}

          {needsWeekdays(data.frequency) ? (
            <div className="space-y-1.5">
              <CheckboxOptionGroup<EventWeekday>
                legend="Occurs on"
                options={EVENT_WEEKDAY_OPTIONS}
                value={data.recurrenceWeekdays}
                onChange={(recurrenceWeekdays) =>
                  onChange({ recurrenceWeekdays })
                }
                className="sm:grid-cols-2"
              />
              {errors.recurrenceWeekdays ? (
                <p className="text-xs text-danger" role="alert">
                  {errors.recurrenceWeekdays}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
