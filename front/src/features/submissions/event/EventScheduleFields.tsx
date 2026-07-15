import { Input } from '@/components/ui'
import type {
  EventContributionData,
  EventFrequency,
  EventScheduleKind,
  RecurrenceEndKind,
} from '@/types/submission'
import type { EventFieldErrors } from './validation'
import { Field } from '../form/Field'
import { OptionCardGroup } from '../form/OptionCardGroup'
import { TimeSelect } from '../form/TimeSelect'

interface EventScheduleFieldsProps {
  data: EventContributionData
  onChange: (partial: Partial<EventContributionData>) => void
  errors: EventFieldErrors
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
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'other', label: 'Other' },
]

const RECURRENCE_END_OPTIONS: {
  value: RecurrenceEndKind
  label: string
}[] = [
  { value: 'none', label: 'No known end date' },
  { value: 'end_date', label: 'End date' },
  { value: 'occurrences', label: 'Number of occurrences' },
  { value: 'not_sure', label: 'Not sure' },
]

export function EventScheduleFields({
  data,
  onChange,
  errors,
}: EventScheduleFieldsProps) {
  return (
    <div className="space-y-4">
      <OptionCardGroup<EventScheduleKind>
        name="event-schedule-kind"
        legend="Is this event:"
        options={SCHEDULE_KIND_OPTIONS}
        value={data.scheduleKind}
        onChange={(scheduleKind) => onChange({ scheduleKind })}
        error={errors.scheduleKind}
        className="sm:grid-cols-2"
      />

      {data.scheduleKind === 'one_time' ? (
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
              onChange={(e) => onChange({ startDate: e.target.value })}
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
              onChange={(startTime) => onChange({ startTime })}
            />
          </Field>
          <Field id="event-end-date" label="End date" error={errors.endDate}>
            <Input
              id="event-end-date"
              type="date"
              value={data.endDate}
              onChange={(e) => onChange({ endDate: e.target.value })}
            />
          </Field>
          <Field id="event-end-time" label="End time" error={errors.endTime}>
            <TimeSelect
              id="event-end-time"
              value={data.endTime}
              onChange={(endTime) => onChange({ endTime })}
            />
          </Field>
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
            <Field
              id="event-recurring-start-time"
              label="Start time"
              required
              error={errors.startTime}
            >
              <TimeSelect
                id="event-recurring-start-time"
                value={data.startTime}
                onChange={(startTime) => onChange({ startTime })}
              />
            </Field>
            <Field
              id="event-recurring-end-time"
              label="End time"
              error={errors.endTime}
            >
              <TimeSelect
                id="event-recurring-end-time"
                value={data.endTime}
                onChange={(endTime) => onChange({ endTime })}
              />
            </Field>
          </div>

          <OptionCardGroup<EventFrequency>
            name="event-frequency"
            legend="Frequency"
            options={FREQUENCY_OPTIONS}
            value={data.frequency}
            onChange={(frequency) => onChange({ frequency })}
            error={errors.frequency}
            className="sm:grid-cols-2"
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

          <OptionCardGroup<RecurrenceEndKind>
            name="event-recurrence-end"
            legend="When does the recurring event end?"
            options={RECURRENCE_END_OPTIONS}
            value={data.recurrenceEndKind}
            onChange={(recurrenceEndKind) => onChange({ recurrenceEndKind })}
            className="sm:grid-cols-2"
          />

          {data.recurrenceEndKind === 'end_date' ? (
            <Field
              id="event-recurrence-end-date"
              label="End date"
              required
              error={errors.recurrenceEndDate}
            >
              <Input
                id="event-recurrence-end-date"
                type="date"
                value={data.recurrenceEndDate}
                onChange={(e) =>
                  onChange({ recurrenceEndDate: e.target.value })
                }
              />
            </Field>
          ) : null}

          {data.recurrenceEndKind === 'occurrences' ? (
            <Field
              id="event-recurrence-occurrences"
              label="Number of occurrences"
              required
              error={errors.recurrenceOccurrences}
            >
              <Input
                id="event-recurrence-occurrences"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={data.recurrenceOccurrences}
                onChange={(e) =>
                  onChange({ recurrenceOccurrences: e.target.value })
                }
                placeholder="e.g. 8"
              />
            </Field>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
