import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useResponsiveSelectionSummary } from '@/hooks/useResponsiveSelectionSummary'
import { getSelectedItemNames, toggleFilterSelection } from '@/utils/filter-selection'
import { cn } from '@/utils/cn'

export interface FilterPopoverItem {
  id: string
  slug: string
  name: string
}

interface FilterPopoverProps {
  label: string
  items: FilterPopoverItem[]
  value: string[]
  onChange: (slugs: string[]) => void
  emptySummary: string
  isLoading?: boolean
  error?: string | null
  disabled?: boolean
  /** When true, label is used for accessibility only (title provided by WorkspaceSection). */
  hideLabel?: boolean
  className?: string
}

export function FilterPopover({
  label,
  items,
  value,
  onChange,
  emptySummary,
  isLoading = false,
  error = null,
  disabled = false,
  hideLabel = false,
  className,
}: FilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const allSlugs = items.map((item) => item.slug)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const isDisabled = disabled || isLoading || Boolean(error) || items.length === 0

  const selectedNames = useMemo(() => getSelectedItemNames(value, items), [value, items])
  const { summary: responsiveSummary, textRef, measureRef } = useResponsiveSelectionSummary(
    selectedNames,
    emptySummary,
  )

  const summary = isLoading
    ? 'Loading…'
    : error
      ? 'Unable to load'
      : responsiveSummary

  const handleSelect = (slug: string) => {
    onChange(toggleFilterSelection(value, slug, allSlugs))
  }

  return (
    <div className={cn(!hideLabel && 'space-y-1.5', className)}>
      {!hideLabel && (
        <span className="text-sm font-medium text-foreground">{label}</span>
      )}

      <div ref={containerRef} className="relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDisabled}
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className="h-9 w-full !justify-between gap-2 px-3 text-left text-sm font-normal"
        >
          <span
            ref={textRef}
            className={cn(
              'min-w-0 flex-1 truncate text-left',
              value.length === 0 && 'text-muted-foreground',
            )}
          >
            {summary}
          </span>
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
        </Button>

        <span
          ref={measureRef}
          aria-hidden
          className="pointer-events-none invisible absolute left-0 top-0 -z-10 whitespace-nowrap text-sm"
        />

        {error && (
          <p className="mt-1 text-xs text-danger" role="alert">
            {error}
          </p>
        )}

        {isOpen && !isDisabled && (
          <div
            role="listbox"
            aria-label={label}
            aria-multiselectable="true"
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-md scrollbar-thin"
          >
            {items.map((item) => (
              <FilterPopoverOption
                key={item.id}
                name={item.name}
                isSelected={value.includes(item.slug)}
                onSelect={() => handleSelect(item.slug)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FilterPopoverOption({
  name,
  isSelected,
  onSelect,
}: {
  name: string
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
        'hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
        isSelected ? 'text-interactive' : 'text-foreground',
      )}
    >
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
          isSelected
            ? 'border-interactive bg-interactive text-interactive-foreground'
            : 'border-border bg-surface',
        )}
        aria-hidden="true"
      >
        {isSelected && <Check className="h-3 w-3" />}
      </span>
      {name}
    </button>
  )
}
