import { ArrowRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ContributionType } from '@/types/submission'
import { CONTRIBUTION_TYPE_META } from '../constants/contributionTypes'

interface ContributionTypeCardProps {
  type: ContributionType
  onSelect: (type: ContributionType) => void
}

/**
 * Entire card is the interactive control — no nested buttons.
 * Equal height in the type-picker grid via h-full stretch.
 */
export function ContributionTypeCard({
  type,
  onSelect,
}: ContributionTypeCardProps) {
  const meta = CONTRIBUTION_TYPE_META[type]
  const Icon = meta.icon

  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      aria-label={`Get Started: ${meta.label}`}
      className={cn(
        'group relative flex h-full w-full flex-col rounded-2xl border border-border bg-surface p-4 pb-10 text-left shadow-sm',
        'transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out',
        'hover:-translate-y-0.5 hover:border-interactive hover:bg-surface-raised hover:shadow-md',
        'focus-visible:-translate-y-0.5 focus-visible:border-interactive focus-visible:bg-surface-raised focus-visible:shadow-md',
        'focus-ring',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-muted text-primary',
            'transition-colors duration-200',
            'group-hover:bg-interactive-muted group-hover:text-interactive',
            'group-focus-visible:bg-interactive-muted group-focus-visible:text-interactive',
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </span>

        <h3
          className={cn(
            'min-w-0 font-heading text-base font-semibold leading-snug text-foreground sm:text-lg',
            'transition-colors duration-200',
            'group-hover:text-primary group-focus-visible:text-primary',
          )}
        >
          {meta.label}
        </h3>
      </div>

      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
        {meta.description}
      </p>

      <div
        className="mt-2.5 w-full border-t border-border-subtle"
        aria-hidden="true"
      />

      <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-interactive">Examples:</span>{' '}
        {meta.examples}
      </p>

      <span
        className={cn(
          'pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 text-sm font-medium text-interactive',
          'translate-y-1 opacity-0 transition-[opacity,transform] duration-200 ease-out',
          'group-hover:translate-y-0 group-hover:opacity-100',
          'group-focus-visible:translate-y-0 group-focus-visible:opacity-100',
        )}
        aria-hidden="true"
      >
        <span>Get Started</span>
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" />
      </span>
    </button>
  )
}
