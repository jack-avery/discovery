import { cn } from '@/utils/cn'

export interface CheckboxOption<T extends string> {
  value: T
  label: string
}

interface CheckboxOptionGroupProps<T extends string> {
  legend: string
  options: CheckboxOption<T>[]
  value: T[]
  onChange: (value: T[]) => void
  hint?: string
  className?: string
}

export function CheckboxOptionGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
  hint,
  className,
}: CheckboxOptionGroupProps<T>) {
  const toggle = (option: T) => {
    if (value.includes(option)) onChange(value.filter((v) => v !== option))
    else onChange([...value, option])
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <div className={cn('grid gap-2 sm:grid-cols-2', className)}>
        {options.map((option) => {
          const id = `checkbox-${legend.replace(/\s+/g, '-').toLowerCase()}-${option.value}`
          const selected = value.includes(option.value)
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm transition-colors',
                selected
                  ? 'border-interactive bg-interactive-muted'
                  : 'border-border hover:border-interactive/50',
                'focus-within:ring-2 focus-within:ring-interactive/40',
              )}
            >
              <input
                id={id}
                type="checkbox"
                checked={selected}
                onChange={() => toggle(option.value)}
                className="rounded border-border"
              />
              <span className="font-medium text-foreground">{option.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
