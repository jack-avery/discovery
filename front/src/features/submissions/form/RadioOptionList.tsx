import { cn } from '@/utils/cn'

export interface RadioOption<T extends string> {
  value: T
  label: string
  description?: string
}

interface RadioOptionListProps<T extends string> {
  name: string
  legend: string
  options: RadioOption<T>[]
  value: T | null
  onChange: (value: T) => void
  error?: string
  className?: string
}

/**
 * Vertical radio list: one option per row, entire row clickable.
 * Prefer this over OptionCardGroup when labels are long.
 */
export function RadioOptionList<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  className,
}: RadioOptionListProps<T>) {
  const errorId = error ? `${name}-error` : undefined

  return (
    <fieldset className={cn('space-y-2', className)} aria-describedby={errorId}>
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      <div className="space-y-1">
        {options.map((option) => {
          const selected = value === option.value
          const id = `${name}-${option.value}`
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 transition-colors',
                selected ? 'bg-interactive-muted' : 'hover:bg-muted/60',
                'focus-within:ring-2 focus-within:ring-interactive/40',
              )}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="mt-0.5 h-4 w-4 shrink-0 border-border text-interactive focus:ring-interactive"
                aria-invalid={error ? true : undefined}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-snug text-foreground">
                  {option.label}
                </span>
                {option.description ? (
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          )
        })}
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
