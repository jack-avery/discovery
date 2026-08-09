import { PencilLine, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

const eyebrowClassName =
  'font-heading text-xs font-semibold uppercase tracking-[0.14em] text-interactive sm:text-sm'

const contributionCards = [
  {
    id: 'keep-accurate',
    title: 'Keep it accurate',
    question: 'Spot outdated information?',
    answer:
      'Browse the map and use Request an Update at the bottom of any resource to help keep information accurate.',
    icon: PencilLine,
    ctaLabel: 'Browse Resources',
    href: '/',
  },
  {
    id: 'share-knowledge',
    title: 'Share what you know',
    question: "Know about a local resource that isn't on the map?",
    answer: 'Share it so others in your community can discover it too.',
    icon: PlusCircle,
    ctaLabel: 'Submit a Resource',
    href: '/submit',
  },
] as const

/**
 * Landing section encouraging community contributions (update vs submit).
 */
export function HelpKeepMapGrowingSection() {
  return (
    <section
      aria-labelledby="help-keep-map-growing-heading"
      className="px-5 sm:px-8 lg:px-10 xl:px-14"
    >
      <div className="mx-auto max-w-6xl rounded-3xl border border-border/60 bg-surface/90 px-5 py-8 shadow-lg sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className={eyebrowClassName}>Help keep the map growing</p>
          <span
            className="mx-auto mt-2.5 block h-1 w-10 rounded-full bg-interactive"
            aria-hidden="true"
          />
          <h2
            id="help-keep-map-growing-heading"
            className="mt-4 font-heading text-2xl font-bold leading-tight tracking-tight text-foreground sm:mt-5 sm:text-3xl lg:text-[2rem] lg:leading-[1.2]"
          >
            Your knowledge makes the community stronger.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Whether you&apos;re correcting outdated information or sharing something
            new, every contribution helps make the map more valuable for everyone.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:gap-8">
          {contributionCards.map((card) => {
            const Icon = card.icon
            return (
              <article
                key={card.id}
                className={cn(
                  'flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm',
                  'transition-shadow duration-200 hover:shadow-md sm:p-7',
                )}
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-interactive-muted text-interactive"
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>

                <h3 className="mt-4 font-heading text-xl font-semibold leading-snug text-foreground">
                  {card.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  <strong className="font-semibold text-foreground">
                    {card.question}
                  </strong>{' '}
                  {card.answer}
                </p>

                <div className="mt-5">
                  <Button
                    href={card.href}
                    variant="outline"
                    size="md"
                    className="w-full border-interactive text-interactive hover:border-interactive hover:bg-interactive-muted hover:text-interactive sm:w-auto"
                  >
                    {card.ctaLabel}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
