import { cn } from '@/utils/cn'

export interface OptionCardOption<T extends string> {
  value: T
  label: string
  description?: string
}

interface OptionCardGroupProps<T extends string> {
  name: string
  legend: string
  options: OptionCardOption<T>[]
  value: T | null
  onChange: (value: T) => void
  error?: string
  className?: string
}

/**
 * Card-styled radio group.
 *
 * The native radio fills the card (`absolute inset-0 opacity-0`) so its focus
 * geometry matches the visible option. Using `sr-only` (1×1 absolute clip)
 * inside a sheet with a `relative` dialog ancestor caused the browser to
 * scroll the editor body to an off-screen focus target.
 */
export function OptionCardGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  className,
}: OptionCardGroupProps<T>) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      <div className={cn('grid gap-2 sm:grid-cols-3', className)}>
        {options.map((option) => {
          const selected = value === option.value
          const id = `${name}-${option.value}`
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                'relative cursor-pointer rounded-xl border bg-surface px-3 py-3 transition-colors',
                selected
                  ? 'border-interactive bg-interactive-muted'
                  : 'border-border hover:border-interactive/50',
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
                className="absolute inset-0 z-10 cursor-pointer opacity-0"
              />
              <span className="relative z-0 block text-sm font-medium text-foreground">
                {option.label}
              </span>
              {option.description ? (
                <span className="relative z-0 mt-0.5 block text-xs text-muted-foreground">
                  {option.description}
                </span>
              ) : null}
            </label>
          )
        })}
      </div>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
