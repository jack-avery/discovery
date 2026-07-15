import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const MINUTE_STEPS = [0, 15, 30, 45] as const

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

/** Stored value format: HH:MM (24-hour), always on a 15-minute boundary. */
export function buildQuarterHourOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of MINUTE_STEPS) {
      const value = `${pad(hour)}:${pad(minute)}`
      const period = hour < 12 ? 'AM' : 'PM'
      const hour12 = hour % 12 === 0 ? 12 : hour % 12
      const label = `${hour12}:${pad(minute)} ${period}`
      options.push({ value, label })
    }
  }
  return options
}

const QUARTER_HOUR_OPTIONS = buildQuarterHourOptions()

export function isQuarterHourTime(value: string): boolean {
  return QUARTER_HOUR_OPTIONS.some((o) => o.value === value)
}

type TimeSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'children' | 'value' | 'onChange'
> & {
  value: string
  onChange: (value: string) => void
  /** Placeholder option when empty (e.g. “Select a time”). */
  placeholder?: string
}

/**
 * Accessible time picker limited to 15-minute increments.
 * Stores values as HH:MM for compatibility with existing validation.
 */
export const TimeSelect = forwardRef<HTMLSelectElement, TimeSelectProps>(
  (
    {
      id,
      value,
      onChange,
      className,
      placeholder = 'Select a time',
      disabled,
      'aria-label': ariaLabel,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
      ...rest
    },
    ref,
  ) => {
    const known = !value || isQuarterHourTime(value)

    return (
      <select
        ref={ref}
        id={id}
        value={known ? value : ''}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive/40 focus-visible:border-interactive',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !value && 'text-muted-foreground',
          className,
        )}
        {...rest}
      >
        <option value="">{placeholder}</option>
        {!known && value ? (
          <option value="" disabled>
            {value} (choose a 15-minute time)
          </option>
        ) : null}
        {QUARTER_HOUR_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  },
)

TimeSelect.displayName = 'TimeSelect'
