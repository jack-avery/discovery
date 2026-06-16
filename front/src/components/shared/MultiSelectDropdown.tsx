import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { getFilterTriggerLabel, isAllSelected, toggleFilterSelection } from '@/utils/filter-selection'
import { cn } from '@/utils/cn'

export interface MultiSelectItem {
  id: string
  slug: string
  name: string
}

interface MultiSelectDropdownProps {
  label: string
  items: MultiSelectItem[]
  value?: string[]
  onChange?: (slugs: string[]) => void
  isLoading?: boolean
  error?: string | null
  disabled?: boolean
  /** Borderless trigger styling for use inside a floating control bubble. */
  floating?: boolean
  className?: string
}

export function MultiSelectDropdown({
  label,
  items,
  value = [],
  onChange,
  isLoading = false,
  error = null,
  disabled = false,
  floating = false,
  className,
}: MultiSelectDropdownProps) {
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
  const triggerLabel = getFilterTriggerLabel(label, value)

  const handleSelect = (slug: string | 'all') => {
    onChange?.(toggleFilterSelection(value, slug, allSlugs))
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative shrink-0', floating && 'h-full w-full min-w-0', className)}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isDisabled}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          'justify-between gap-1.5 text-sm',
          floating
            ? 'h-full min-h-0 w-full min-w-0 rounded-none px-2.5 border-0 bg-transparent shadow-none hover:bg-muted/60'
            : 'h-9 min-w-[6.5rem] px-3',
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
      </Button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={`Filter by ${label.toLowerCase()}`}
          aria-multiselectable="true"
          className="absolute right-0 z-30 mt-1 max-h-60 w-52 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-md scrollbar-thin"
        >
          <OptionRow
            name="All"
            isSelected={isAllSelected(value)}
            onSelect={() => handleSelect('all')}
          />
          {items.map((item) => (
            <OptionRow
              key={item.id}
              name={item.name}
              isSelected={!isAllSelected(value) && value.includes(item.slug)}
              onSelect={() => handleSelect(item.slug)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OptionRow({
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
            : 'border-border',
        )}
        aria-hidden="true"
      >
        {isSelected && <Check className="h-3 w-3" />}
      </span>
      {name}
    </button>
  )
}
