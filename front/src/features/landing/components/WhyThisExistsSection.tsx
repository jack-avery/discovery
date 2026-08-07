import whyExistsPlaceholder from '@/assets/why-exists-placeholder.png'

const eyebrowClassName =
  'font-heading text-xs font-semibold uppercase tracking-[0.14em] text-interactive sm:text-sm'

/**
 * Landing “Why This Exists” section: image-backed floating panel.
 */
export function WhyThisExistsSection() {
  return (
    <section
      aria-labelledby="why-this-exists-heading"
      className="relative h-[55vh] max-h-[600px] min-h-[480px] shrink-0 overflow-hidden"
    >
      {/* Background image */}
      <img
        src={whyExistsPlaceholder}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
        width={1536}
        height={1024}
        decoding="async"
      />

      {/* Soft wash so the frosted panel stays legible without hiding the photo */}
      <div className="absolute inset-0 bg-foreground/10" aria-hidden="true" />

      {/* Floating content panel */}
      <div className="relative z-10 flex h-full items-center justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
        <div className="w-full max-w-[1150px] rounded-3xl bg-surface/80 px-8 py-7 shadow-lg backdrop-blur-md sm:px-12 sm:py-9 lg:px-16 lg:py-10">
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
      </div>
    </section>
  )
}
