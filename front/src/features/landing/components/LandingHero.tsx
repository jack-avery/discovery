import { useEffect, useState } from 'react'
import { PlusCircle, Search } from 'lucide-react'
import heroPlaceholder from '@/assets/hero-placeholder.png'
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

/**
 * Public landing hero: full-bleed background image with rotating copy and dual CTAs.
 */
export function LandingHero() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)

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
    if (reduceMotion || heroSlides.length <= 1) {
      return
    }

    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % heroSlides.length)
    }, ROTATION_MS)

    return () => window.clearInterval(id)
  }, [reduceMotion])

  return (
    <section
      aria-labelledby="landing-hero-heading"
      className="relative h-[60vh] max-h-[700px] min-h-[400px] shrink-0 overflow-hidden"
    >
      {/* Background image */}
      <img
        src={heroPlaceholder}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
        width={1536}
        height={1024}
        decoding="async"
      />

      {/* Left-to-right readability overlay — stronger on mobile */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-surface via-surface/90 to-surface/40 sm:from-surface/95 sm:via-surface/80 sm:to-transparent"
        aria-hidden="true"
      />

      {/* Content — fills the fixed hero height; does not contribute to section sizing */}
      <div className="relative z-10 flex h-full items-center px-5 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14 xl:px-14">
        <div className="w-full max-w-[36rem]">
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
            <Button href="/" variant="primary" size="lg" className="w-full sm:w-auto">
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
        </div>
      </div>
    </section>
  )
}
