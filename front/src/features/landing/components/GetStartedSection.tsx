import { Play } from 'lucide-react'
import { Button } from '@/components/ui'

const eyebrowClassName =
  'font-heading text-xs font-semibold uppercase tracking-[0.14em] text-interactive sm:text-sm'

/**
 * Compact final CTA inviting users into Discover via the guided tour.
 *
 * TODO(feature/guided-tour): Wire this button to start the guided tour once
 * that experience exists. For now it opens Discover so users can begin exploring.
 */
export function GetStartedSection() {
  return (
    <section
      aria-labelledby="get-started-heading"
      className="bg-background px-5 py-8 sm:px-8 sm:py-9 lg:px-10 lg:py-10 xl:px-14"
    >
      <div className="mx-auto max-w-2xl text-center">
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
          <Button href="/" variant="primary" size="lg">
            <Play className="h-4 w-4 shrink-0" aria-hidden="true" />
            Take a Guided Tour
          </Button>
        </div>
      </div>
    </section>
  )
}
