import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

interface EditorSectionProps {
  id: string
  title: string
  description?: string
  children: ReactNode
  className?: string
  /** When set with onToggle, header collapses/expands the body. */
  expanded?: boolean
  onToggle?: () => void
  /** Update mode: show a live edited marker in the header. */
  edited?: boolean
}

export function EditorSection({
  id,
  title,
  description,
  children,
  className,
  expanded = true,
  onToggle,
  edited = false,
}: EditorSectionProps) {
  const collapsible = typeof onToggle === 'function'
  const showBody = !collapsible || expanded
  const titleId = `${id}-title`

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        'space-y-4 rounded-xl border border-border-subtle bg-surface p-4 sm:p-5',
        'scroll-mt-[var(--editor-sticky-offset,8rem)]',
        className,
      )}
    >
      {collapsible ? (
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 text-left focus-ring rounded-md"
          aria-expanded={expanded}
          aria-controls={`${id}-body`}
          onClick={onToggle}
        >
          <div className="min-w-0 space-y-1">
            <h3
              id={titleId}
              className="font-heading text-base font-semibold text-foreground"
            >
              {title}
              {edited ? (
                <span className="ml-2 font-bold text-interactive">
                  • Edited
                </span>
              ) : null}
            </h3>
            {description && expanded ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <ChevronDown
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              expanded && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>
      ) : (
        <div className="space-y-1">
          <h3
            id={titleId}
            className="font-heading text-base font-semibold text-foreground"
          >
            {title}
            {edited ? (
              <span className="ml-2 font-bold text-interactive">• Edited</span>
            ) : null}
          </h3>
          {description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      )}

      {showBody ? (
        <div id={`${id}-body`} className="space-y-4">
          {children}
        </div>
      ) : null}
    </section>
  )
}
