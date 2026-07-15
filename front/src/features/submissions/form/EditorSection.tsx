import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface EditorSectionProps {
  id: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function EditorSection({
  id,
  title,
  description,
  children,
  className,
}: EditorSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        'space-y-4 rounded-xl border border-border-subtle bg-surface p-4 sm:p-5',
        'scroll-mt-[var(--editor-sticky-offset,8rem)]',
        className,
      )}
    >
      <div className="space-y-1">
        <h3
          id={`${id}-title`}
          className="font-heading text-base font-semibold text-foreground"
        >
          {title}
        </h3>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
