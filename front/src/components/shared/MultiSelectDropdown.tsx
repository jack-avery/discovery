import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useResponsiveSelectionSummary } from '@/hooks/useResponsiveSelectionSummary'
import { getSelectedItemNames, isAllSelected, toggleFilterSelection } from '@/utils/filter-selection'
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
  onRetry?: () => void
  disabled?: boolean
  /** Borderless trigger for use inside a floating control bubble. */
  floating?: boolean
  /** Label for the clear-all option (defaults to "All"). */
  allOptionLabel?: string
  className?: string
}

interface MenuPosition {
  top: number
  left: number
  minWidth: number
  maxWidth: number
}

/**
 * Multi-select filter dropdown.
 *
 * The menu is portaled to `document.body` with `position: fixed` so ancestors
 * with `overflow: hidden` (e.g. the Staff review queue panel) cannot clip it.
 * In-tree `absolute` + `right-0` menus grow leftward when wider than the
 * trigger and get their left edge cropped by that overflow.
 */
export function MultiSelectDropdown({
  label,
  items,
  value = [],
  onChange,
  isLoading = false,
  error = null,
  onRetry,
  disabled = false,
  floating = false,
  allOptionLabel = 'All',
  className,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const allSlugs = items.map((item) => item.slug)
  const selectedNames = useMemo(
    () => (isAllSelected(value) ? [] : getSelectedItemNames(value, items)),
    [value, items],
  )
  const { summary, textRef, measureRef } = useResponsiveSelectionSummary(selectedNames, label)

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPosition(null)
      return
    }

    const gutter = 12

    function updatePosition() {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const maxWidth = Math.min(24 * 16, window.innerWidth - gutter * 2)
      let left = rect.left

      const menu = menuRef.current
      if (menu) {
        const menuWidth = menu.getBoundingClientRect().width
        if (left + menuWidth > window.innerWidth - gutter) {
          left = Math.max(gutter, window.innerWidth - gutter - menuWidth)
        }
      }

      setMenuPosition({
        top: rect.bottom + 4,
        left,
        minWidth: rect.width,
        maxWidth,
      })
    }

    updatePosition()
    // Re-measure after the portaled menu paints so viewport clamping can use its width.
    const rafId = window.requestAnimationFrame(updatePosition)

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setIsOpen(false)
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

  const handleSelect = (slug: string | 'all') => {
    onChange?.(toggleFilterSelection(value, slug, allSlugs))
  }

  const menu =
    isOpen && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={`Filter by ${label.toLowerCase()}`}
            aria-multiselectable="true"
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              minWidth: menuPosition.minWidth,
              maxWidth: menuPosition.maxWidth,
              zIndex: 50,
            }}
            className="max-h-60 w-max overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-md scrollbar-thin"
          >
            <OptionRow
              name={allOptionLabel}
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
          </div>,
          document.body,
        )
      : null

  return (
    <div ref={containerRef} className={cn('relative shrink-0', floating && 'h-full', className)}>
      <div ref={triggerRef} className="h-full w-full">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDisabled}
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={cn(
            'min-w-[6.5rem] w-full !justify-between gap-2 px-3 text-left text-sm',
            floating
              ? 'h-full rounded-none border-0 bg-transparent shadow-none hover:bg-transparent hover:text-foreground'
              : 'h-9',
          )}
        >
          <span ref={textRef} className="min-w-0 flex-1 truncate text-left">
            {summary}
          </span>
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
        </Button>
      </div>
      <span
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 -z-10 whitespace-nowrap text-sm"
      />
      {error ? (
        <div className="mt-1.5 space-y-1.5">
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}
      {menu}
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
      <span className="whitespace-nowrap">{name}</span>
    </button>
  )
}
