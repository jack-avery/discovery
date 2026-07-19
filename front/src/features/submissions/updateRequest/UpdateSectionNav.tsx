import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import {
  UPDATE_SECTION_OPTIONS,
  type UpdateSectionId,
} from './updateSections'

interface UpdateSectionNavProps {
  editedSections: UpdateSectionId[]
  onSelect: (sectionId: UpdateSectionId) => void
  activeSectionId?: UpdateSectionId | null
}

/**
 * Header section navigator for the update workspace.
 * Matches the submission stepper’s circle + label language; circles reflect
 * edit state (not unlock progress).
 */
export function UpdateSectionNav({
  editedSections,
  onSelect,
  activeSectionId = null,
}: UpdateSectionNavProps) {
  const edited = new Set(editedSections)

  return (
    <nav
      className="shrink-0 border-b border-border bg-surface px-3 py-2 sm:px-4"
      aria-label="Resource sections"
    >
      <ul className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
        {UPDATE_SECTION_OPTIONS.map((option) => {
          const isEdited = edited.has(option.id)
          const isActive = activeSectionId === option.id
          return (
            <li key={option.id} className="flex shrink-0">
              <button
                type="button"
                onClick={() => onSelect(option.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-0.5 py-0.5 transition-colors focus-ring',
                  'hover:opacity-90',
                )}
                aria-current={isActive ? 'true' : undefined}
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                    isEdited
                      ? 'bg-interactive text-interactive-foreground'
                      : 'bg-muted text-muted-foreground',
                    isActive &&
                      'ring-2 ring-interactive/45 ring-offset-1 ring-offset-surface',
                  )}
                  aria-hidden="true"
                >
                  {isEdited ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : null}
                </span>
                <span
                  className={cn(
                    'text-xs',
                    isActive
                      ? 'font-medium text-foreground'
                      : isEdited
                        ? 'font-medium text-interactive'
                        : 'text-muted-foreground',
                  )}
                >
                  {option.label}
                </span>
                {isEdited ? (
                  <span className="sr-only"> (edited)</span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
