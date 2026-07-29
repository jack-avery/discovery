import { useCallback, useEffect, useRef, useState } from 'react'
import type { FocusEvent, TouchEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Heart,
  Home,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react'
import { cn } from '@/utils/cn'

export type DiscoverySlide = {
  category: string
  description: string
  icon: LucideIcon
  /** Soft circular icon background */
  iconWrapClassName: string
  /** Icon colour */
  iconClassName: string
  /** Active pagination dot colour */
  dotClassName: string
}

/** Edit this list to change or reorder discovery carousel slides. */
export const discoverySlides: DiscoverySlide[] = [
  {
    category: 'Health & Wellness',
    description:
      'Community health centres, counselling services, mental health support, fitness programs, and more.',
    icon: Heart,
    iconWrapClassName: 'bg-[#ebe4f6]',
    iconClassName: 'text-[#5b4a8a]',
    dotClassName: 'bg-[#7c6aad]',
  },
  {
    category: 'Food & Nutrition',
    description:
      'Food banks, community meals, markets, nutrition programs, and food support services.',
    icon: UtensilsCrossed,
    iconWrapClassName: 'bg-[#e4f2e8]',
    iconClassName: 'text-[#15803d]',
    dotClassName: 'bg-[#15803d]',
  },
  {
    category: 'Housing',
    description:
      'Emergency housing, shelters, affordable housing, and housing support services.',
    icon: Home,
    iconWrapClassName: 'bg-[#e4eef8]',
    iconClassName: 'text-[#1b365d]',
    dotClassName: 'bg-[#1b365d]',
  },
  {
    category: 'Employment',
    description:
      'Employment centres, job opportunities, resume help, and career training.',
    icon: Briefcase,
    iconWrapClassName: 'bg-[#f7e6d2]',
    iconClassName: 'text-pending-hover',
    dotClassName: 'bg-pending',
  },
  {
    category: 'Events & Activities',
    description:
      'Community events, workshops, recreation programs, and local gatherings.',
    icon: Calendar,
    iconWrapClassName: 'bg-interactive-muted',
    iconClassName: 'text-interactive',
    dotClassName: 'bg-interactive',
  },
  {
    category: 'Skills & Opportunities',
    description:
      'Volunteer opportunities, mentoring, local skills, classes, and community initiatives.',
    icon: Sparkles,
    iconWrapClassName: 'bg-[#e8e6f8]',
    iconClassName: 'text-[#4338ca]',
    dotClassName: 'bg-[#4338ca]',
  },
]

const ROTATION_MS = 5500
const CROSSFADE_MS = 700
const SWIPE_THRESHOLD_PX = 48

const eyebrowClassName =
  'font-heading text-xs font-semibold uppercase tracking-[0.14em] text-interactive sm:text-sm'

const navButtonClassName = cn(
  'absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center',
  'rounded-full border border-border bg-surface text-foreground shadow-sm',
  'transition-colors hover:bg-muted focus-ring',
  'sm:h-10 sm:w-10',
)

/**
 * Landing “Why This Exists” section with rotating discovery categories.
 */
export function WhyThisExistsSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const slideCount = discoverySlides.length

  const selectSlide = useCallback((index: number) => {
    if (slideCount === 0) return
    const nextIndex = ((index % slideCount) + slideCount) % slideCount
    setActiveIndex(nextIndex)
  }, [slideCount])

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
    if (!start || !touch) return

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

  const activeSlide = discoverySlides[activeIndex]

  return (
    <section
      aria-labelledby="why-this-exists-heading"
      className="bg-[#f3f7fa] px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20 xl:px-14"
    >
      {/* Top — Why this exists (editorial intro) */}
      <div className="mx-auto max-w-2xl text-center">
        <p className={eyebrowClassName}>Why this exists</p>
        <span
          className="mx-auto mt-3 block h-1 w-10 rounded-full bg-interactive"
          aria-hidden="true"
        />

        <h2
          id="why-this-exists-heading"
          className="mx-auto mt-5 max-w-xl font-heading text-2xl font-bold leading-tight tracking-tight text-foreground sm:mt-6 sm:text-3xl lg:text-[2rem] lg:leading-[1.2]"
        >
          Valuable community resources are often difficult to find.
        </h2>

        <div className="mx-auto mt-5 max-w-lg space-y-4 text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
          <p>
            Many local programs, events, services, and informal supports are
            shared through word of mouth or scattered across different places.
          </p>
          <p>
            The Community Resource Map brings that knowledge together so it is
            easier to discover and use.
          </p>
        </div>
      </div>

      {/* Separation */}
      <div className="mx-auto mt-12 max-w-5xl sm:mt-14 lg:mt-16">
        <hr className="border-0 border-t border-border/70" />
      </div>

      {/* Bottom — What you can discover */}
      <div className="mx-auto mt-10 max-w-5xl sm:mt-12 lg:mt-14">
        <p className={eyebrowClassName}>What you can discover</p>
        <span
          className="mt-3 block h-1 w-10 rounded-full bg-interactive"
          aria-hidden="true"
        />
        <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Explore different types of local resources and opportunities.
        </p>

        <div
          className="relative mt-6 rounded-xl border border-border bg-surface px-4 py-6 shadow-sm sm:mt-8 sm:px-6 sm:py-7 lg:px-8"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={handleCarouselBlur}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="relative">
            <button
              type="button"
              aria-label="Previous category"
              onClick={showPreviousSlide}
              className={cn(navButtonClassName, 'left-1 sm:left-2')}
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              aria-label="Next category"
              onClick={showNextSlide}
              className={cn(navButtonClassName, 'right-1 sm:right-2')}
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            </button>

            <div
              className="grid px-11 sm:px-14 lg:px-16"
              aria-live="polite"
              aria-atomic="true"
            >
              {discoverySlides.map((slide, index) => {
                const Icon = slide.icon
                const isActive = index === activeIndex
                return (
                  <div
                    key={slide.category}
                    className={cn(
                      'col-start-1 row-start-1 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left lg:gap-8',
                      !reduceMotion && 'transition-opacity ease-in-out',
                      isActive
                        ? 'opacity-100'
                        : 'pointer-events-none opacity-0',
                    )}
                    style={
                      reduceMotion
                        ? undefined
                        : { transitionDuration: `${CROSSFADE_MS}ms` }
                    }
                    aria-hidden={!isActive}
                  >
                    <div
                      className={cn(
                        'flex h-20 w-20 shrink-0 items-center justify-center rounded-full lg:h-24 lg:w-24',
                        slide.iconWrapClassName,
                      )}
                      aria-hidden="true"
                    >
                      <Icon
                        className={cn(
                          'h-9 w-9 sm:h-10 sm:w-10',
                          slide.iconClassName,
                        )}
                        strokeWidth={1.75}
                      />
                    </div>

                    <div className="min-w-0 flex-1 sm:max-w-2xl">
                      <h3 className="font-heading text-xl font-semibold leading-snug text-foreground sm:text-2xl">
                        {slide.category}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {slide.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 sm:mt-6">
            {discoverySlides.map((slide, index) => {
              const isActive = index === activeIndex
              return (
                <button
                  key={slide.category}
                  type="button"
                  aria-label={`Go to ${slide.category}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => selectSlide(index)}
                  className="flex h-8 w-8 items-center justify-center rounded-full focus-ring"
                >
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full transition-colors',
                      isActive
                        ? (activeSlide?.dotClassName ?? 'bg-foreground')
                        : 'bg-border',
                    )}
                    aria-hidden="true"
                  />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
