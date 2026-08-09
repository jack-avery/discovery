import type { ReactNode } from 'react'
import landingPageBackground from '@/assets/hero-placeholder.png'

/**
 * Stationary community backdrop for the full landing page (hero + story sections).
 *
 * Uses a sticky, viewport-tall background layer (not background-attachment: fixed)
 * so hero overlays and content panels scroll over one continuous scene.
 */
export function LandingStoryBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate">
      <div
        className="pointer-events-none sticky top-0 z-0 h-svh w-full overflow-hidden"
        aria-hidden="true"
      >
        <img
          src={landingPageBackground}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          width={1536}
          height={1024}
          decoding="async"
        />
        <div className="absolute inset-0 bg-foreground/10" />
      </div>

      <div className="relative z-10 -mt-[100svh]">{children}</div>
    </div>
  )
}
