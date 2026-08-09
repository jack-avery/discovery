const eyebrowClassName =
  'font-heading text-xs font-semibold uppercase tracking-[0.14em] text-interactive sm:text-sm'

/**
 * Landing “Why This Exists” section: floating panel over the shared story background.
 */
export function WhyThisExistsSection() {
  return (
    <section
      aria-labelledby="why-this-exists-heading"
      className="px-5 sm:px-8 lg:px-10 xl:px-14"
    >
      <div className="mx-auto w-full max-w-[1150px] rounded-3xl border border-border/60 bg-surface/90 px-8 py-7 shadow-lg sm:px-12 sm:py-9 lg:px-16 lg:py-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className={eyebrowClassName}>Why this exists</p>
          <span
            className="mx-auto mt-2.5 block h-1 w-10 rounded-full bg-interactive"
            aria-hidden="true"
          />

          <h2
            id="why-this-exists-heading"
            className="mx-auto mt-4 max-w-3xl font-heading text-2xl font-bold leading-tight tracking-tight text-foreground sm:mt-5 sm:text-3xl lg:text-[2rem] lg:leading-[1.2]"
          >
            Valuable community resources are often difficult to find.
          </h2>

          <div className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
            <p>
              Many local programs, events, services, and informal supports are
              shared through word of mouth or scattered across different places.
            </p>

            <p className="mx-auto mt-8 max-w-2xl rounded-2xl bg-primary px-8 py-6 font-semibold leading-relaxed text-primary-foreground sm:leading-8">
              The Community Resource Map brings this knowledge together in one
              place so it&apos;s easier for everyone to discover.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
