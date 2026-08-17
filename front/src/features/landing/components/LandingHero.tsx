import { useCallback, useEffect, useRef, useState } from 'react'
import type { TouchEvent } from 'react'
import { ChevronLeft, ChevronRight, PlusCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

export type LandingHeroSlide = {
  headline: string
  description: string
}

/** Edit this list to change or reorder rotating hero slides. */
export const heroSlides: LandingHeroSlide[] = [
  {
    headline: 'Uncover local resources you might otherwise miss.',
    description:
      "Discover local programs, services, events, and community knowledge that aren't always easy to find online.",
  },
  {
    headline: 'Share what you know so others can benefit.',
    description:
      'Help grow the map by contributing local resources, events, skills, and opportunities from your community.',
  },
  {
    headline: 'Build a stronger, more connected community.',
    description:
      'Help residents and community workers connect people with practical supports that improve wellbeing beyond traditional care.',
  },
]

const ROTATION_MS = 7000
const CROSSFADE_MS = 700
const SWIPE_THRESHOLD_PX = 48

const arrowButtonClassName = cn(
  'absolute top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center',
  'rounded-full border border-border/80 bg-surface/90 text-foreground shadow-sm backdrop-blur-sm',
  'transition-colors hover:bg-surface active:bg-muted focus-ring',
  'md:flex',
)

/**
 * Public landing hero: gradient readability overlay over the shared page background.
 */
export function LandingHero() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)
  /** Bumped on manual navigation so auto-rotation restarts cleanly. */
  const [rotationEpoch, setRotationEpoch] = useState(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')

    const syncPreference = () => {
      setReduceMotion(media.matches)
    }

    syncPreference()
    media.addEventListener('change', syncPreference)
    return () => media.removeEventListener('change', syncPreference)
  }, [])

  const goToSlide = useCallback((index: number) => {
    const count = heroSlides.length
    if (count <= 0) return
    const next = ((index % count) + count) % count
    setActiveIndex(next)
    setRotationEpoch((epoch) => epoch + 1)
  }, [])

  const goToPrevious = useCallback(() => {
    goToSlide(activeIndex - 1)
  }, [activeIndex, goToSlide])

  const goToNext = useCallback(() => {
    goToSlide(activeIndex + 1)
  }, [activeIndex, goToSlide])

  useEffect(() => {
    if (reduceMotion || heroSlides.length <= 1) {
      return
    }

    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % heroSlides.length)
    }, ROTATION_MS)

    return () => window.clearInterval(id)
  }, [reduceMotion, rotationEpoch])

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.changedTouches[0]
    if (!touch) return
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStartRef.current
    const touch = event.changedTouches[0]
    touchStartRef.current = null
    if (!start || !touch || heroSlides.length <= 1) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return
    if (Math.abs(deltaX) < Math.abs(deltaY)) return

    if (deltaX < 0) {
      goToNext()
    } else {
      goToPrevious()
    }
  }

  const showControls = heroSlides.length > 1

  return (
    <section
      aria-labelledby="landing-hero-heading"
      aria-roledescription="carousel"
      className="relative h-[60vh] max-h-[700px] min-h-[400px] shrink-0"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/*
        Readability overlays over the shared photo.
        Mobile and desktop are separate layers so desktop stays pixel-identical.
      */}
      {/* Mobile (< md): vertical top→bottom — light overlay through BOTH CTAs; photo fade only below */}
      <div
        className="absolute inset-0 md:hidden"
        style={{
          backgroundImage: [
            'linear-gradient(',
            'to bottom,',
            // 0–60%: strong light behind heading + description
            'var(--color-surface) 0%,',
            'color-mix(in srgb, var(--color-surface) 98%, transparent) 30%,',
            'color-mix(in srgb, var(--color-surface) 96%, transparent) 50%,',
            'color-mix(in srgb, var(--color-surface) 94%, transparent) 60%,',
            // 60–75%: modest reduction only
            'color-mix(in srgb, var(--color-surface) 90%, transparent) 68%,',
            'color-mix(in srgb, var(--color-surface) 86%, transparent) 75%,',
            // 75–85%: still clearly light behind Explore + Contribute CTAs
            'color-mix(in srgb, var(--color-surface) 82%, transparent) 80%,',
            'color-mix(in srgb, var(--color-surface) 78%, transparent) 85%,',
            // 85–100%: stronger fade into the photograph
            'color-mix(in srgb, var(--color-surface) 45%, transparent) 92%,',
            'color-mix(in srgb, var(--color-surface) 12%, transparent) 97%,',
            'transparent 100%',
            ')',
          ].join(' '),
        }}
        aria-hidden="true"
      />
      {/* Desktop (md+): existing left→right overlay + bottom mask — unchanged */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 hidden md:block',
          'bg-gradient-to-r from-surface/95 via-surface/80 to-transparent',
          '[mask-image:linear-gradient(to_bottom,black_calc(100%-9rem),transparent)]',
        )}
        aria-hidden="true"
      />

      {showControls ? (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={goToPrevious}
            className={cn(arrowButtonClassName, 'left-3 lg:left-5')}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={goToNext}
            className={cn(arrowButtonClassName, 'right-3 lg:right-5')}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </>
      ) : null}

      {/* Content — fills the fixed hero height; does not contribute to section sizing */}
      <div
        className={cn(
          'relative z-10 flex h-full items-center py-10 sm:py-12 lg:py-14',
          // Mobile: existing horizontal padding (no side arrows).
          'px-5 sm:px-8',
          // Desktop: inset past the outer carousel arrows so content never overlaps them.
          'md:px-16 lg:px-20 xl:px-24',
        )}
      >        <div className="w-full max-w-[36rem]">
          <div className="grid" aria-live="polite" aria-atomic="true">
            {heroSlides.map((slide, index) => {
              const isActive = index === activeIndex
              return (
                <div
                  key={slide.headline}
                  className={cn(
                    'col-start-1 row-start-1',
                    !reduceMotion && 'transition-opacity ease-in-out',
                    isActive ? 'opacity-100' : 'pointer-events-none opacity-0',
                  )}
                  style={
                    reduceMotion
                      ? undefined
                      : { transitionDuration: `${CROSSFADE_MS}ms` }
                  }
                  aria-hidden={!isActive}
                >
                  <h1
                    id={isActive ? 'landing-hero-heading' : undefined}
                    className="font-heading text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-[1.15]"
                  >
                    {slide.headline}
                  </h1>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
                    {slide.description}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
            <Button href="/discover" variant="primary" size="lg" className="w-full sm:w-auto">
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              Explore the Map
            </Button>

            <Button
              href="/submit"
              variant="outline"
              size="lg"
              className="w-full border-interactive text-interactive hover:border-interactive hover:bg-interactive-muted hover:text-interactive sm:w-auto"
            >
              <PlusCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Contribute a Resource
            </Button>
          </div>

          <p className="mt-4 max-w-sm text-xs leading-relaxed text-foreground sm:mt-5 sm:max-w-[22rem] sm:text-[0.8125rem]">
            This map is currently being piloted with select communities in the
            Rideau-Rockcliffe ward.
          </p>

          {/* Mobile pagination — in flow under CTAs so it does not cover copy/buttons */}
          {showControls ? (
            <div
              className="mt-5 flex items-center justify-center gap-2 md:hidden"
              role="group"
              aria-label="Hero slides"
            >
              {heroSlides.map((slide, index) => {
                const isActive = index === activeIndex
                return (
                  <button
                    key={slide.headline}
                    type="button"
                    aria-current={isActive ? 'true' : undefined}
                    aria-label={`Go to slide ${index + 1}`}
                    onClick={() => goToSlide(index)}
                    className={cn(
                      'h-2.5 rounded-full transition-[width,background-color] focus-ring',
                      isActive
                        ? 'w-6 bg-interactive'
                        : 'w-2.5 bg-foreground/30 hover:bg-foreground/45',
                    )}
                  />
                )
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* Desktop pagination — bottom center of the hero */}
      {showControls ? (
        <div
          className="absolute bottom-5 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 md:flex"
          role="group"
          aria-label="Hero slides"
        >
          {heroSlides.map((slide, index) => {
            const isActive = index === activeIndex
            return (
              <button
                key={slide.headline}
                type="button"
                aria-current={isActive ? 'true' : undefined}
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => goToSlide(index)}
                className={cn(
                  'h-2.5 rounded-full border border-border/60 shadow-sm transition-[width,background-color] focus-ring',
                  isActive
                    ? 'w-6 bg-interactive'
                    : 'w-2.5 bg-surface/85 hover:bg-surface',
                )}
              />
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
