import type { ReactNode } from 'react'
import { useState } from 'react'
import { Info, MapPin, Settings } from 'lucide-react'
import resourcePlaceholder from '@/assets/resource-placeholder.svg'
import { DetailSectionCard } from '@/features/discover/DetailInfoCard'
import { cn } from '@/utils/cn'

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim())
}

/**
 * Full-bleed hero used by Discover resource detail and staff moderation review.
 */
export function ResourceDetailHero({
  imageUrl,
  alt,
  fallbackAlt = 'Community resource placeholder',
}: {
  imageUrl: string | null
  alt: string
  /** Accessible label when the placeholder artwork is shown. */
  fallbackAlt?: string
}) {
  const [failed, setFailed] = useState(false)
  const src = hasText(imageUrl) && !failed ? imageUrl! : resourcePlaceholder
  const usingFallback = src === resourcePlaceholder

  return (
    <div
      className={cn(
        '-mx-[var(--ds-workspace-padding)] -mt-[var(--ds-workspace-padding)]',
        'mb-0 overflow-hidden rounded-b-xl bg-muted',
      )}
    >
      <div className="aspect-[17/8] w-full">
        <img
          src={src}
          alt={usingFallback ? fallbackAlt : alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    </div>
  )
}

/**
 * Shared About card chrome — body is read-only content or editable fields.
 */
export function ResourceDetailAboutShell({
  children,
  headerAction,
  className,
}: {
  children: ReactNode
  headerAction?: ReactNode
  className?: string
}) {
  return (
    <DetailSectionCard
      icon={<Info className="h-4 w-4" strokeWidth={2} />}
      title="About"
      headerAction={headerAction}
      className={className}
    >
      {children}
    </DetailSectionCard>
  )
}

/**
 * Shared Location card chrome.
 */
export function ResourceDetailLocationShell({
  title = 'Location',
  children,
  headerAction,
  className,
}: {
  title?: string
  children: ReactNode
  headerAction?: ReactNode
  className?: string
}) {
  return (
    <DetailSectionCard
      icon={<MapPin className="h-4 w-4" strokeWidth={2} />}
      title={title}
      headerAction={headerAction}
      className={className}
    >
      {children}
    </DetailSectionCard>
  )
}

/**
 * Shared Service Details card chrome.
 */
export function ResourceDetailServiceDetailsShell({
  children,
  headerAction,
  className,
}: {
  children: ReactNode
  headerAction?: ReactNode
  className?: string
}) {
  return (
    <DetailSectionCard
      icon={<Settings className="h-4 w-4" strokeWidth={2} />}
      title="Service Details"
      headerAction={headerAction}
      className={className}
    >
      {children}
    </DetailSectionCard>
  )
}
