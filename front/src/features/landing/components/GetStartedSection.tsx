import { Play } from 'lucide-react'
import { Button } from '@/components/ui'
import { DISCOVER_START_TOUR_QUERY } from '@/features/discover/constants'

const eyebrowClassName =
  'font-heading text-xs font-semibold uppercase tracking-[0.14em] text-interactive sm:text-sm'

/** Public landing CTA → Discover with one-shot `?tour=1` to auto-start the guided tour. */
export function guidedTourHref(): string {
  return `/?${DISCOVER_START_TOUR_QUERY}=1`
}

/**
 * Compact final CTA inviting users into Discover via the guided tour.
 */
export function GetStartedSection() {
  return (
    <section
      aria-labelledby="get-started-heading"
      className="px-5 sm:px-8 lg:px-10 xl:px-14"
    >
      <div className="mx-auto max-w-2xl rounded-3xl border border-border/60 bg-surface/90 px-6 py-8 text-center shadow-lg sm:px-10 sm:py-9">
        <p className={eyebrowClassName}>Ready to explore?</p>
        <span
          className="mx-auto mt-2 block h-1 w-10 rounded-full bg-interactive"
          aria-hidden="true"
        />

        <h2
          id="get-started-heading"
          className="mt-4 font-heading text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-[1.875rem] lg:leading-[1.2]"
        >
          See how easy it is to get started.
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Take a quick guided tour to learn how to use the map.
        </p>

        <div className="mt-5 flex justify-center sm:mt-6">
          <Button href={guidedTourHref()} variant="primary" size="lg">
            <Play className="h-4 w-4 shrink-0" aria-hidden="true" />
            Take a Guided Tour
          </Button>
        </div>
      </div>
    </section>
  )
}
