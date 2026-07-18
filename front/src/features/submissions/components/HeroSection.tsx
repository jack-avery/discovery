import { HeroMedia } from './HeroMedia'

/**
 * Compact, full-width hero with centred overlay copy on decorative background.
 * Contribution choices below are owned by ContributionBuilder — do not couple here.
 */
export function HeroSection() {
  return (
    <section
      aria-labelledby="submit-hero-heading"
      className="relative flex min-h-[13.5rem] items-center justify-center overflow-hidden border-b border-border-subtle sm:min-h-[15rem]"
    >
      <HeroMedia />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-8 text-center sm:px-6 sm:py-10">
        <div className="flex items-center gap-3">
          <span
            className="h-px w-6 bg-interactive/50 sm:w-8"
            aria-hidden="true"
          />
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-interactive sm:text-sm">
            Submit a Contribution
          </p>
          <span
            className="h-px w-6 bg-interactive/50 sm:w-8"
            aria-hidden="true"
          />
        </div>

        <h1
          id="submit-hero-heading"
          className="mt-4 font-heading text-2xl font-semibold leading-tight tracking-tight text-foreground sm:mt-5 sm:text-3xl"
        >
          Tell us about something that could help people in the
          Rideau-Rockcliffe community.
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
          Whether it&apos;s an existing resource, an event, or a skill you&apos;d
          like to share, every contribution helps strengthen our community.
        </p>
      </div>
    </section>
  )
}
