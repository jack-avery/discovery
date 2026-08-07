import {
  GetStartedSection,
  HelpKeepMapGrowingSection,
  LandingHeader,
  LandingHero,
  WhatYouCanDiscoverSection,
  WhyThisExistsSection,
} from '@/features/landing'

/**
 * Public landing page at `/home`.
 * Hero → Why This Exists → What You Can Discover → Contribute → Get Started.
 */
export function HomePage() {
  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin bg-surface">
      <LandingHeader />
      <LandingHero />
      <WhyThisExistsSection />
      <WhatYouCanDiscoverSection />
      <HelpKeepMapGrowingSection />
      <GetStartedSection />
    </div>
  )
}
