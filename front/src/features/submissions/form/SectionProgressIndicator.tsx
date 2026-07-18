import { cn } from '@/utils/cn'

interface SectionProgressIndicatorProps {
  sections: readonly string[]
  revealed: number
  /** Breakpoint at which section labels appear. Default sm. */
  labelBreakpoint?: 'sm' | 'lg'
}

/**
 * Shared section progress chips for contribution editors.
 * Visual behaviour matches the Existing Resource / Event indicators.
 */
export function SectionProgressIndicator({
  sections,
  revealed,
  labelBreakpoint = 'sm',
}: SectionProgressIndicatorProps) {
  const total = sections.length
  const current = Math.min(Math.max(revealed, 1), total)
  const labelVisibility =
    labelBreakpoint === 'lg' ? 'hidden text-xs lg:inline' : 'hidden text-xs sm:inline'

  return (
    <div
      className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1.5 overflow-x-auto pb-0.5 scrollbar-thin"
      aria-label={`Form progress: section ${current} of ${total} unlocked`}
    >
      {sections.map((label, index) => {
        const step = index + 1
        const active = step <= revealed
        return (
          <div key={label} className="flex shrink-0 items-center gap-1.5">
            <span
              className={cn(
                'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-medium',
                active
                  ? 'bg-interactive text-interactive-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {step}
            </span>
            <span
              className={cn(
                labelVisibility,
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
