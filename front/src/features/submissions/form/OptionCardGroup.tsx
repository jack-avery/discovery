import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface OptionCardOption<T extends string> {
  value: T
  label: string
  description?: string
  icon?: ReactNode
}

interface OptionCardGroupProps<T extends string> {
  name: string
  legend: string
  options: OptionCardOption<T>[]
  value: T | null
  onChange: (value: T) => void
  error?: string
  hint?: string
  className?: string
  /**
   * `grid` — multi-column cards (default for rich / described options).
   * `stack` — single full-width column (preferred for long labels).
   * `chips` — compact equal-width bubbles sized to the longest label.
   *
   * Simple label-only options default to `chips` when `layout` is omitted.
   */
  layout?: 'grid' | 'stack' | 'chips'
  /**
   * When true (or when any option has an icon), show a visible radio indicator
   * and stack icon + label like the Location access cards.
   */
  showRadioIndicator?: boolean
}

/**
 * Card-styled radio group — the shared single-select pattern for submission
 * questions (connection, access mode, cost, etc.).
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
  hint,
  className,
  layout,
  showRadioIndicator,
}: OptionCardGroupProps<T>) {
  const rich =
    showRadioIndicator === true || options.some((option) => option.icon)
  const hasDescriptions = options.some((option) => Boolean(option.description))
  const resolvedLayout =
    layout ?? (rich || hasDescriptions ? 'grid' : 'chips')
  const chips = resolvedLayout === 'chips'
  const stack = resolvedLayout === 'stack'

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <div
        className={cn(
          chips
            ? // Equal columns sized by the longest label; left-aligned; wrap on small screens.
              'inline-grid max-w-full grid-cols-2 gap-2 sm:grid-flow-col sm:grid-cols-none sm:auto-cols-[1fr]'
            : cn(
                'grid gap-2',
                stack ? 'grid-cols-1' : 'sm:grid-cols-3',
              ),
          className,
        )}
      >
        {options.map((option) => {
          const selected = value === option.value
          const id = `${name}-${option.value}`
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                'relative cursor-pointer rounded-xl border bg-surface transition-colors',
                chips
                  ? 'inline-flex items-center justify-center px-4 py-2 text-center whitespace-nowrap'
                  : rich
                    ? 'px-3 py-4'
                    : 'px-3 py-3',
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
              {rich && !chips ? (
                <span
                  className={cn(
                    'relative z-0 flex gap-2',
                    option.icon
                      ? 'flex-col items-center gap-2 text-center'
                      : 'items-start text-left',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                      selected ? 'border-interactive' : 'border-border',
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full bg-interactive transition-opacity',
                        selected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    {option.icon ? (
                      <span
                        className={cn(
                          'mb-1 inline-flex text-interactive',
                          !selected && 'text-muted-foreground',
                        )}
                        aria-hidden="true"
                      >
                        {option.icon}
                      </span>
                    ) : null}
                    <span className="block text-sm font-medium leading-snug text-foreground">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </span>
              ) : (
                <>
                  <span className="relative z-0 block text-sm font-medium text-foreground">
                    {option.label}
                  </span>
                  {option.description ? (
                    <span className="relative z-0 mt-0.5 block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  ) : null}
                </>
              )}
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
