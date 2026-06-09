import { Loader2, Tag } from 'lucide-react'
import type { Tag as TagType } from '@/types'
import { EmptyState } from '@/components/shared'
import { cn } from '@/utils/cn'

interface TagFilterProps {
  tags: TagType[]
  isLoading?: boolean
  error?: string | null
  active?: string[]
  onChange?: (slugs: string[]) => void
  disabled?: boolean
}

export function TagFilter({
  tags,
  isLoading = false,
  error = null,
  active = [],
  onChange,
  disabled = false,
}: TagFilterProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2" role="status" aria-label="Loading tags">
        <Loader2 className="h-4 w-4 animate-spin text-interactive" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">Loading tags…</span>
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        title="Unable to load tags"
        description={error}
        icon={<Tag className="h-6 w-6 text-danger" strokeWidth={1.5} />}
        className="py-8"
      />
    )
  }

  if (tags.length === 0) {
    return null
  }

  const toggleTag = (slug: string) => {
    const next = active.includes(slug)
      ? active.filter((s) => s !== slug)
      : [...active, slug]
    onChange?.(next)
  }

  return (
    <div role="group" aria-label="Filter resources by tag">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Tags
      </p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isActive = active.includes(tag.slug)
          return (
            <button
              key={tag.id}
              type="button"
              disabled={disabled}
              aria-pressed={isActive}
              onClick={() => toggleTag(tag.slug)}
              className={cn(
                'rounded-full px-3.5 py-2 text-xs font-medium transition-colors focus-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
                isActive
                  ? 'border border-interactive bg-interactive-muted text-interactive'
                  : 'border border-border bg-surface text-muted-foreground hover:border-interactive/40 hover:text-foreground',
              )}
            >
              {tag.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
