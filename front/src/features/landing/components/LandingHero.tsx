import { useEffect, useState } from 'react'
import { PlusCircle, Search } from 'lucide-react'
import landingHeroPlaceholder from '@/assets/landing-hero-placeholder.svg'
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
 * Public landing hero: rotating headline + description, dual CTAs, and image.
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
      className="relative flex flex-col overflow-hidden bg-surface lg:min-h-[70vh] lg:flex-row"
    >
      {/* Soft blue wash behind the image column */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[40%] bg-gradient-to-l from-[#e4eef5] via-[#eef4f8]/80 to-transparent lg:block"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col justify-center px-5 py-8 sm:px-8 sm:py-10 lg:w-[60%] lg:flex-none lg:px-10 lg:py-12 xl:px-14">
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
                  className="max-w-2xl font-heading text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-[1.15]"
                >
                  {slide.headline}
                </h1>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
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

      <div className="relative z-10 flex items-center justify-center px-5 pb-8 sm:px-8 sm:pb-10 lg:w-[40%] lg:flex-none lg:px-8 lg:py-12 xl:px-12">
        <img
          src={landingHeroPlaceholder}
          alt="Illustration of a community centre, park path, and trees"
          className="h-auto w-full max-w-xl rounded-xl object-cover shadow-md lg:max-w-none"
          width={720}
          height={560}
          decoding="async"
        />
      </div>
    </section>
  )
}
