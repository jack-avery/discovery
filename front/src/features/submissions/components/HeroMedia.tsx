import { cn } from '@/utils/cn'

interface HeroMediaProps {
  className?: string
}

/**
 * Full-bleed decorative hero background (Rideau-Rockcliffe community theme).
 * Low-opacity line art only — text in HeroSection overlays this layer.
 * Safe to replace later without changing HeroSection layout.
 */
export function HeroMedia({ className }: HeroMediaProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden bg-surface',
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1200 360"
        className="absolute inset-0 h-full w-full text-interactive"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Soft map grid — ~8% */}
        <g stroke="currentColor" strokeOpacity="0.08" strokeWidth="1">
          <path d="M0 45h1200M0 90h1200M0 135h1200M0 180h1200M0 225h1200M0 270h1200M0 315h1200" />
          <path d="M75 0v360M150 0v360M225 0v360M300 0v360M375 0v360M450 0v360M525 0v360M600 0v360M675 0v360M750 0v360M825 0v360M900 0v360M975 0v360M1050 0v360M1125 0v360" />
        </g>

        {/* Left trees */}
        <g
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="1.35"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <path d="M72 255l22-52 22 52" />
          <path d="M94 255v28" />
          <path d="M118 262l16-38 16 38" />
          <path d="M134 262v18" />
          <path d="M156 268l12-28 12 28" />
        </g>

        {/* Bridge over river */}
        <g
          stroke="currentColor"
          strokeOpacity="0.14"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M200 248c70-48 140-48 210 0" />
          <path d="M220 248v36M270 228v56M305 220v64M340 228v56M390 248v36" />
          <path d="M200 284h210" />
          <path d="M200 248v36M410 248v36" />
        </g>

        {/* River */}
        <path
          d="M40 300c90-22 160-18 240 6 70 20 140 18 230-4 90-22 170-16 260 8 70 18 140 14 210-6 60-16 120-10 180 8"
          stroke="currentColor"
          strokeOpacity="0.13"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Church / landmark with steeple + map pin */}
        <g
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="1.45"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <path d="M560 284V190l40-28 40 28v94" />
          <path d="M584 162V118l16-22 16 22v44" />
          <path d="M596 96v10" />
          <path d="M575 210h50M575 232h50M575 254h50" />
          <path d="M595 210v44" />
        </g>
        <g fill="currentColor" fillOpacity="0.14">
          <path d="M640 108c0 14-16 28-16 28s-16-14-16-28a16 16 0 1 1 32 0Z" />
          <circle cx="624" cy="108" r="5" className="fill-surface" />
        </g>

        {/* Neighbourhood buildings */}
        <g
          stroke="currentColor"
          strokeOpacity="0.13"
          strokeWidth="1.4"
          strokeLinejoin="round"
        >
          <path d="M680 284V210l32-22 32 22v74" />
          <path d="M744 284V198l28-20 28 20v86" />
          <path d="M800 284v-52l22-16 22 16v52" />
          <path d="M844 284V206l36-24 36 24v78" />
          <path d="M680 284h236" />
          <path d="M700 230h12M700 248h12M724 230h12M724 248h12" />
          <path d="M762 220h10M762 238h10M782 220h10M782 238h10" />
        </g>

        {/* Right trees */}
        <g
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="1.35"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <path d="M1050 262l18-42 18 42" />
          <path d="M1068 262v22" />
          <path d="M1098 268l14-34 14 34" />
          <path d="M1112 268v16" />
        </g>
      </svg>

      {/* Soft wash for text contrast without hiding the illustration */}
      <div className="absolute inset-0 bg-surface/55" />
    </div>
  )
}
