import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FocusEvent, TouchEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ResourcePlaceholderIllustration } from '@/components/shared/ResourcePlaceholderIllustration'
import { useFeaturedResources, useMediaQuery } from '@/hooks'
import type { FeaturedResourceCard } from '@/services/resourceService'
import { cn } from '@/utils/cn'
import { resolveResourceImageUrl } from '@/utils/resolveResourceImageUrl'

const ROTATION_MS = 7000
const SWIPE_THRESHOLD_PX = 48
const MAX_VISIBLE_CHIPS = 3

const eyebrowClassName =
  'font-heading text-xs font-semibold uppercase tracking-[0.14em] text-interactive sm:text-sm'

const navButtonClassName = cn(
  'absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center',
  'rounded-full border border-border bg-surface text-foreground shadow-sm',
  'transition-colors hover:bg-muted focus-ring',
  'sm:h-10 sm:w-10',
)

/** Display-only chip styled to match Discover filter chips (unselected state). */
function ResourceLabelChip({ label }: { label: string }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full shrink-0 truncate rounded-full border px-2.5 py-0.5',
        'border-border/80 bg-surface text-[0.6875rem] font-medium text-foreground shadow-sm',
      )}
    >
      {label}
    </span>
  )
}

function ResourceLabelChips({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null

  const visible = labels.slice(0, MAX_VISIBLE_CHIPS)
  const remaining = labels.length - visible.length

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Categories and tags">
      {visible.map((label) => (
        <ResourceLabelChip key={label} label={label} />
      ))}
      {remaining > 0 ? (
        <span
          className={cn(
            'inline-flex shrink-0 rounded-full border px-2.5 py-0.5',
            'border-border/80 bg-muted text-[0.6875rem] font-medium text-muted-foreground shadow-sm',
          )}
        >
          +{remaining} more
        </span>
      ) : null}
    </div>
  )
}

/*
 * TODO(feature/discover-resource-deeplink):
 * Make the entire resource card clickable.
 *
 * When selected, navigate to the Discover page and automatically open this
 * resource in the resource details panel.
 *
 * This will be implemented in a future branch alongside the Discover page
 * deep-link support.
 *
 * TODO(feature/discover-resource-deeplink):
 * Pass the resource ID to Discover so the resource panel opens automatically
 * after navigation.
 */
function FeaturedResourceCardView({ resource }: { resource: FeaturedResourceCard }) {
  const resolvedImageUrl = resolveResourceImageUrl(resource.imageUrl)
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)
  const hasImage =
    resolvedImageUrl != null && resolvedImageUrl !== failedImageUrl

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="h-[120px] w-full shrink-0 overflow-hidden bg-muted sm:h-[130px]">
        {hasImage ? (
          <img
            src={resolvedImageUrl}
            alt={`${resource.title} photo`}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setFailedImageUrl(resolvedImageUrl)}
          />
        ) : (
          <ResourcePlaceholderIllustration
            className="h-full w-full object-cover"
            decorative
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-3.5 py-3 sm:px-4 sm:py-3.5">
        <h3 className="font-heading text-sm font-semibold leading-snug text-foreground sm:text-base">
          {resource.title}
        </h3>

        {resource.description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {resource.description}
          </p>
        ) : null}

        <div className="mt-auto pt-1">
          <ResourceLabelChips labels={resource.labels} />
        </div>
      </div>
    </article>
  )
}

function FeaturedResourceCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="h-[120px] w-full animate-pulse bg-muted sm:h-[130px]" />
      <div className="space-y-1.5 px-3.5 py-3 sm:px-4 sm:py-3.5">
        <div className="h-4 w-2/3 max-w-[10rem] animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-4/5 max-w-[12rem] animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

/**
 * Landing showcase: multi-card carousel of live published resources.
 */
export function WhatYouCanDiscoverSection() {
  const { resources, isLoading, error } = useFeaturedResources()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isTablet = useMediaQuery('(min-width: 768px)')
  const pageSize = isDesktop ? 3 : isTablet ? 2 : 1

  const [pageIndex, setPageIndex] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const pageCount = Math.max(1, Math.ceil(resources.length / pageSize))

  const visibleResources = useMemo(() => {
    const start = pageIndex * pageSize
    return resources.slice(start, start + pageSize)
  }, [pageIndex, pageSize, resources])

  const selectPage = useCallback(
    (index: number) => {
      if (pageCount <= 0) return
      const nextIndex = ((index % pageCount) + pageCount) % pageCount
      setPageIndex(nextIndex)
    },
    [pageCount],
  )

  const showNextPage = useCallback(() => {
    setPageIndex((current) => (current + 1) % pageCount)
  }, [pageCount])

  const showPreviousPage = useCallback(() => {
    setPageIndex((current) => (current - 1 + pageCount) % pageCount)
  }, [pageCount])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')

    const syncPreference = () => {
      setReduceMotion(media.matches)
    }

    syncPreference()
    media.addEventListener('change', syncPreference)
    return () => media.removeEventListener('change', syncPreference)
  }, [])

  useEffect(() => {
    setPageIndex(0)
  }, [pageSize])

  useEffect(() => {
    if (pageIndex < pageCount) return
    setPageIndex(0)
  }, [pageIndex, pageCount])

  useEffect(() => {
    if (reduceMotion || isPaused || pageCount <= 1) {
      return
    }

    const id = window.setInterval(() => {
      setPageIndex((current) => (current + 1) % pageCount)
    }, ROTATION_MS)

    return () => window.clearInterval(id)
  }, [reduceMotion, isPaused, pageIndex, pageCount])

  const handleCarouselBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return
    }
    setIsPaused(false)
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0]
    if (!touch) return
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current
    const touch = event.changedTouches[0]
    touchStartRef.current = null
    if (!start || !touch || pageCount <= 1) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return

    if (deltaX < 0) {
      showNextPage()
    } else {
      showPreviousPage()
    }
  }

  return (
    <section
      aria-labelledby="what-you-can-discover-heading"
      className="px-5 sm:px-8 lg:px-10 xl:px-14"
    >
      <div className="mx-auto max-w-6xl rounded-3xl border border-border/60 bg-surface/90 px-5 py-8 shadow-lg sm:px-8 sm:py-9 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className={eyebrowClassName}>Discover resources across the community</p>
          <span
            className="mx-auto mt-2.5 block h-1 w-10 rounded-full bg-interactive"
            aria-hidden="true"
          />
          <h2
            id="what-you-can-discover-heading"
            className="mt-4 font-heading text-2xl font-bold leading-tight tracking-tight text-foreground sm:mt-5 sm:text-3xl lg:text-[2rem] lg:leading-[1.2]"
          >
            Find support, opportunities, and local connections.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Whether you&apos;re looking for a local service, volunteer opportunity,
            community program, or event, the map helps you discover what&apos;s
            available nearby.
          </p>
        </div>

        <div
          className="relative mt-8 sm:mt-10"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={handleCarouselBlur}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {isLoading ? (
            <div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
              aria-busy="true"
              aria-label="Loading featured resources"
            >
              {Array.from({ length: pageSize }, (_, index) => (
                <FeaturedResourceCardSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-border bg-surface px-6 py-8 text-center shadow-sm">
              <p className="text-sm text-muted-foreground sm:text-base">
                Featured resources couldn&apos;t be loaded right now. Explore the
                map to browse what&apos;s available.
              </p>
              <Link
                to="/discover"
                className="mt-4 inline-flex text-sm font-medium text-interactive underline-offset-4 hover:underline focus-ring"
              >
                Open the map
              </Link>
            </div>
          ) : resources.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface px-6 py-8 text-center shadow-sm">
              <p className="text-sm text-muted-foreground sm:text-base">
                Published resources will appear here as the community grows the
                map.
              </p>
              <Link
                to="/discover"
                className="mt-4 inline-flex text-sm font-medium text-interactive underline-offset-4 hover:underline focus-ring"
              >
                Explore the map
              </Link>
            </div>
          ) : (
            <>
              <div className="relative px-0 sm:px-12">
                {pageCount > 1 ? (
                  <>
                    <button
                      type="button"
                      aria-label="Previous resources"
                      onClick={showPreviousPage}
                      className={cn(
                        navButtonClassName,
                        'left-0 hidden sm:flex',
                      )}
                    >
                      <ChevronLeft
                        className="h-4 w-4 sm:h-5 sm:w-5"
                        aria-hidden="true"
                      />
                    </button>

                    <button
                      type="button"
                      aria-label="Next resources"
                      onClick={showNextPage}
                      className={cn(
                        navButtonClassName,
                        'right-0 hidden sm:flex',
                      )}
                    >
                      <ChevronRight
                        className="h-4 w-4 sm:h-5 sm:w-5"
                        aria-hidden="true"
                      />
                    </button>
                  </>
                ) : null}

                <div
                  key={pageIndex}
                  className={cn(
                    'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3',
                    !reduceMotion && 'transition-opacity duration-500',
                  )}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {/*
                    TODO(feature/discover-resource-deeplink):
                    Replace the current non-interactive card wrapper with a
                    Link/button once Discover supports opening resources via
                    URL/query parameter.
                  */}
                  {visibleResources.map((resource) => (
                    <FeaturedResourceCardView
                      key={resource.id}
                      resource={resource}
                    />
                  ))}
                </div>
              </div>

              {pageCount > 1 ? (
                <div className="mt-4 flex items-center justify-center gap-2">
                  {Array.from({ length: pageCount }, (_, index) => {
                    const isActive = index === pageIndex
                    return (
                      <button
                        key={index}
                        type="button"
                        aria-label={`Go to resource group ${index + 1}`}
                        aria-current={isActive ? 'true' : undefined}
                        onClick={() => selectPage(index)}
                        className="flex h-8 w-8 items-center justify-center rounded-full focus-ring"
                      >
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full transition-colors',
                            isActive ? 'bg-interactive' : 'bg-border',
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
