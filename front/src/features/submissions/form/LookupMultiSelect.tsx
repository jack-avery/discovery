import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { cn } from '@/utils/cn'

export interface LookupOption {
  id: number
  name: string
  description?: string | null
}

interface LookupMultiSelectProps {
  label: string
  options: LookupOption[]
  value: number[]
  onChange: (ids: number[]) => void
  isLoading?: boolean
  error?: string | null
  /** When set with `error`, shows a Retry action to reload options. */
  onRetry?: () => void
  fieldError?: string
  required?: boolean
  searchable?: boolean
  emptyMessage?: string
}

export function LookupMultiSelect({
  label,
  options,
  value,
  onChange,
  isLoading = false,
  error = null,
  onRetry,
  fieldError,
  required,
  searchable = true,
  emptyMessage = 'No options available.',
}: LookupMultiSelectProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q),
    )
  }, [options, query])

  const toggle = (id: number) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id))
    else onChange([...value, id])
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {label}
          {required ? (
            <span className="text-danger" aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </p>
        {value.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {value.length} selected
          </p>
        ) : null}
      </div>

      {searchable ? (
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}…`}
            className="pl-9"
            aria-label={`Search ${label}`}
          />
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <div className="space-y-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-3">
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul
          className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2 scrollbar-thin"
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
        >
          {filtered.map((option) => {
            const selected = value.includes(option.id)
            return (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => toggle(option.id)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                    selected
                      ? 'bg-interactive-muted text-foreground'
                      : 'hover:bg-muted',
                    'focus-ring',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      selected
                        ? 'border-interactive bg-interactive text-interactive-foreground'
                        : 'border-border',
                    )}
                    aria-hidden="true"
                  >
                    {selected ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span>
                    <span className="font-medium">{option.name}</span>
                    {option.description ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
          {filtered.length === 0 ? (
            <li className="px-2 py-3 text-sm text-muted-foreground">
              No matches for “{query}”.
            </li>
          ) : null}
        </ul>
      )}

      {fieldError ? (
        <p className="text-xs text-danger" role="alert">
          {fieldError}
        </p>
      ) : null}
    </div>
  )
}
