import {
  GetStartedSection,
  HelpKeepMapGrowingSection,
  LandingHeader,
  LandingHero,
  LandingStoryBackground,
  WhatYouCanDiscoverSection,
  WhyThisExistsSection,
} from '@/features/landing'

/**
 * Public landing page at `/home`.
 * One shared sticky scene; hero + narrative panels scroll over it.
 */
export function HomePage() {
  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin bg-surface">
      <LandingHeader />
      <LandingStoryBackground>
        <LandingHero />
        <div className="flex flex-col gap-12 py-12 sm:gap-14 sm:py-14 lg:gap-16 lg:py-16">
          <WhyThisExistsSection />
          <WhatYouCanDiscoverSection />
          <HelpKeepMapGrowingSection />
          <GetStartedSection />
        </div>
      </LandingStoryBackground>
    </div>
  )
}
