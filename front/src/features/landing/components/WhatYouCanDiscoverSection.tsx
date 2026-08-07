import { useCallback, useEffect, useRef, useState } from 'react'
import type { FocusEvent, TouchEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import resourcePlaceholder from '@/assets/resource-placeholder.svg'
import { useFeaturedResources } from '@/hooks'
import type { FeaturedResourceCard } from '@/services/resourceService'
import { cn } from '@/utils/cn'

const ROTATION_MS = 7000
const CROSSFADE_MS = 700
const SWIPE_THRESHOLD_PX = 48
const MAX_VISIBLE_CHIPS = 4

/** Example opportunity types for the overview list — not database categories. */
const DISCOVERY_EXAMPLES = [
  'Community services',
  'Volunteer opportunities',
  'Recreation programs',
  'Local events and activities',
  'Support groups and community initiatives',
  'And much more',
] as const

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
        'inline-flex max-w-full shrink-0 truncate rounded-full border px-3 py-1',
        'border-border/80 bg-surface text-xs font-medium text-foreground shadow-sm',
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
            'inline-flex shrink-0 rounded-full border px-3 py-1',
            'border-border/80 bg-muted text-xs font-medium text-muted-foreground shadow-sm',
          )}
        >
          +{remaining} more
        </span>
      ) : null}
    </div>
  )
}

// TODO(feature/landing-discover-integration):
// Make featured resource cards navigable.
// Clicking a card should open the corresponding resource in Discover.
//
// TODO(feature/landing-discover-integration):
// Replace the current non-interactive carousel cards with links once
// Discover supports deep-linking to individual resources.
//
// TODO(feature/landing-discover-integration):
// Support ?resource=<id> deep-linking on Discover.
// On load, automatically open the requested resource and pan/focus the map.
//
// TODO(feature/landing-discover-integration):
// Add a shared query parameter constant for landing → Discover navigation
// (e.g. DISCOVER_OPEN_RESOURCE_QUERY = 'resource' in discover/constants).
function FeaturedResourceSlide({
  resource,
  isActive,
  reduceMotion,
}: {
  resource: FeaturedResourceCard
  isActive: boolean
  reduceMotion: boolean
}) {
  const [imageFailed, setImageFailed] = useState(false)
  /*
   * TODO(improvement/landing-visual-polish)
   *
   * Replace the temporary placeholder carousel artwork with a version
   * that uses the application's design tokens instead of hardcoded colors.
   * The illustration should automatically inherit future theme updates.
   */
  const imageSrc =
    resource.imageUrl?.trim() && !imageFailed
      ? resource.imageUrl
      : resourcePlaceholder
  const usingPlaceholder = imageSrc === resourcePlaceholder

  return (
    <article
      className={cn(
        'col-start-1 row-start-1 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm',
        !reduceMotion && 'transition-opacity ease-in-out',
        isActive ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      style={
        reduceMotion ? undefined : { transitionDuration: `${CROSSFADE_MS}ms` }
      }
      aria-hidden={!isActive}
    >
      <div className="h-[140px] w-full overflow-hidden bg-muted sm:h-[160px]">
        <img
          src={imageSrc}
          alt={usingPlaceholder ? '' : `${resource.title} photo`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      </div>

      <div className="space-y-1.5 px-4 py-3 sm:px-5 sm:py-3.5">
        <h3 className="font-heading text-base font-semibold leading-snug text-foreground sm:text-lg">
          {resource.title}
        </h3>

        {resource.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {resource.description}
          </p>
        ) : null}

        <ResourceLabelChips labels={resource.labels} />
      </div>
    </article>
  )
}

/**
 * Two-column landing section: explanatory copy + live published resource carousel.
 */
export function WhatYouCanDiscoverSection() {
  const { resources, isLoading, error } = useFeaturedResources()
  const [activeIndex, setActiveIndex] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const slideCount = resources.length

  const selectSlide = useCallback(
    (index: number) => {
      if (slideCount === 0) return
      const nextIndex = ((index % slideCount) + slideCount) % slideCount
      setActiveIndex(nextIndex)
    },
    [slideCount],
  )

  const showNextSlide = useCallback(() => {
    setActiveIndex((current) => (current + 1) % slideCount)
  }, [slideCount])

  const showPreviousSlide = useCallback(() => {
    setActiveIndex((current) => (current - 1 + slideCount) % slideCount)
  }, [slideCount])

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
    if (activeIndex < slideCount) return
    setActiveIndex(0)
  }, [activeIndex, slideCount])

  useEffect(() => {
    if (reduceMotion || isPaused || slideCount <= 1) {
      return
    }

    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount)
    }, ROTATION_MS)

    return () => window.clearInterval(id)
  }, [reduceMotion, isPaused, activeIndex, slideCount])

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
    if (!start || !touch || slideCount <= 1) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return

    if (deltaX < 0) {
      showNextSlide()
    } else {
      showPreviousSlide()
    }
  }

  return (
    <section
      aria-labelledby="what-you-can-discover-heading"
      className="bg-background px-5 py-8 sm:px-8 sm:py-9 lg:px-10 lg:py-10 xl:px-14"
    >
      <div className="mx-auto max-w-6xl">
        {/* Section label — mirrors Why This Exists eyebrow rhythm */}
        <div className="text-center">
          <h2 id="what-you-can-discover-heading" className={eyebrowClassName}>
            Discover resources across the community
          </h2>
          <span
            className="mx-auto mt-2 block h-1 w-10 rounded-full bg-interactive"
            aria-hidden="true"
          />
        </div>

        <div className="mt-5 grid gap-6 sm:mt-6 lg:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)] lg:items-center lg:gap-8 xl:gap-10">
          {/* Left — scannable overview (examples only; not fixed DB categories) */}
          <div className="max-w-md lg:max-w-none">
            <p className="text-sm font-medium text-foreground sm:text-base">
              You can discover:
            </p>

            <ul className="mt-3 space-y-2.5">
              {DISCOVERY_EXAMPLES.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm leading-snug text-muted-foreground sm:text-[0.9375rem]"
                >
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-interactive-muted text-interactive"
                    aria-hidden="true"
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="mt-5 rounded-xl border border-border-subtle bg-primary-muted px-3.5 py-2.5 text-sm leading-relaxed text-muted-foreground">
              New resources are continuously added by community members and
              organizations.
            </p>
          </div>

          {/* Right — featured resource carousel */}
          <div
            className="relative min-w-0"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocusCapture={() => setIsPaused(true)}
            onBlurCapture={handleCarouselBlur}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {isLoading ? (
              <div
                className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
                aria-busy="true"
                aria-label="Loading featured resources"
              >
                <div className="h-[140px] w-full animate-pulse bg-muted sm:h-[160px]" />
                <div className="space-y-1.5 px-4 py-3 sm:px-5 sm:py-3.5">
                  <div className="h-5 w-2/3 max-w-xs animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-4/5 max-w-md animate-pulse rounded bg-muted" />
                </div>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-border bg-surface px-6 py-8 text-center shadow-sm">
                <p className="text-sm text-muted-foreground sm:text-base">
                  Featured resources couldn&apos;t be loaded right now. Explore the
                  map to browse what&apos;s available.
                </p>
                <Link
                  to="/"
                  className="mt-4 inline-flex text-sm font-medium text-interactive underline-offset-4 hover:underline focus-ring"
                >
                  Open the map
                </Link>
              </div>
            ) : slideCount === 0 ? (
              <div className="rounded-2xl border border-border bg-surface px-6 py-8 text-center shadow-sm">
                <p className="text-sm text-muted-foreground sm:text-base">
                  Published resources will appear here as the community grows the
                  map.
                </p>
                <Link
                  to="/"
                  className="mt-4 inline-flex text-sm font-medium text-interactive underline-offset-4 hover:underline focus-ring"
                >
                  Explore the map
                </Link>
              </div>
            ) : (
              <>
                <div className="relative">
                  {slideCount > 1 ? (
                    <>
                      <button
                        type="button"
                        aria-label="Previous resource"
                        onClick={showPreviousSlide}
                        className={cn(navButtonClassName, 'left-2 sm:left-3')}
                      >
                        <ChevronLeft
                          className="h-4 w-4 sm:h-5 sm:w-5"
                          aria-hidden="true"
                        />
                      </button>

                      <button
                        type="button"
                        aria-label="Next resource"
                        onClick={showNextSlide}
                        className={cn(navButtonClassName, 'right-2 sm:right-3')}
                      >
                        <ChevronRight
                          className="h-4 w-4 sm:h-5 sm:w-5"
                          aria-hidden="true"
                        />
                      </button>
                    </>
                  ) : null}

                  <div className="grid" aria-live="polite" aria-atomic="true">
                    {resources.map((resource, index) => (
                      <FeaturedResourceSlide
                        key={resource.id}
                        resource={resource}
                        isActive={index === activeIndex}
                        reduceMotion={reduceMotion}
                      />
                    ))}
                  </div>
                </div>

                {slideCount > 1 ? (
                  <div className="mt-2.5 flex items-center justify-center gap-2 sm:mt-3">
                    {resources.map((resource, index) => {
                      const isActive = index === activeIndex
                      return (
                        <button
                          key={resource.id}
                          type="button"
                          aria-label={`Go to ${resource.title}`}
                          aria-current={isActive ? 'true' : undefined}
                          onClick={() => selectSlide(index)}
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
      </div>
    </section>
  )
}
