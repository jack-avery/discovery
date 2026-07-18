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
                'cursor-pointer rounded-xl border bg-surface px-3 py-3 transition-colors',
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
                className="sr-only"
              />
              <span className="block text-sm font-medium text-foreground">
                {option.label}
              </span>
              {option.description ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
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
