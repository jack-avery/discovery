import {
  LandingHeader,
  LandingHero,
  WhyThisExistsSection,
} from '@/features/landing'

/**
 * Public landing page at `/home`.
 * Hero + “Why This Exists” for now — additional sections will follow later.
 */
export function HomePage() {
  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin bg-surface">
      <LandingHeader />
      <LandingHero />
      <WhyThisExistsSection />
    </div>
  )
}
