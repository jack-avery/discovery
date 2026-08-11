import { useId } from 'react'
import { cn } from '@/utils/cn'

interface ResourcePlaceholderIllustrationProps {
  className?: string
  /** Accessible name when the illustration is meaningful; omit when decorative. */
  title?: string
  decorative?: boolean
}

/**
 * Default resource artwork when no uploaded image is available.
 *
 * Accent tones derive from `--color-map-pin` (via `--ds-map-pin`) so theme
 * changes recolour the illustration without editing this geometry.
 */
export function ResourcePlaceholderIllustration({
  className,
  title = 'Community resource',
  decorative = false,
}: ResourcePlaceholderIllustrationProps) {
  const rawId = useId().replace(/:/g, '')
  const skyId = `resource-ph-sky-${rawId}`
  const glowId = `resource-ph-glow-${rawId}`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 400"
      preserveAspectRatio="xMidYMid slice"
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      className={cn('block h-full w-full', className)}
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0.4" y2="1">
          <stop
            offset="0%"
            stopColor="color-mix(in srgb, var(--color-map-pin) 42%, #1a1012)"
          />
          <stop
            offset="55%"
            stopColor="color-mix(in srgb, var(--color-map-pin) 72%, #2a1416)"
          />
          <stop offset="100%" stopColor="var(--color-map-pin)" />
        </linearGradient>
        <linearGradient id={glowId} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="640" height="400" fill={`url(#${skyId})`} />
      <circle cx="520" cy="72" r="48" fill={`url(#${glowId})`} />
      <path
        d="M0 268c48-28 96-42 148-38 62 5 98 34 156 36 54 2 92-22 148-28 52-6 106 4 188 36v126H0V268z"
        fill="var(--color-map-pin)"
        opacity="0.45"
      />
      <path
        d="M0 300c56-22 108-34 164-28 70 8 110 40 170 38 48-2 84-24 138-28 58-4 110 10 168 34v84H0V300z"
        fill="#faf7f2"
        opacity="0.12"
      />
      <rect
        x="214"
        y="148"
        width="212"
        height="148"
        rx="18"
        fill="#faf7f2"
        opacity="0.92"
      />
      <rect
        x="236"
        y="170"
        width="72"
        height="52"
        rx="8"
        fill="var(--color-map-pin)"
        opacity="0.35"
      />
      <rect
        x="332"
        y="170"
        width="72"
        height="52"
        rx="8"
        fill="color-mix(in srgb, var(--color-map-pin) 50%, #1a1012)"
        opacity="0.28"
      />
      <rect
        x="236"
        y="236"
        width="168"
        height="12"
        rx="6"
        fill="color-mix(in srgb, var(--color-map-pin) 50%, #1a1012)"
        opacity="0.22"
      />
      <rect
        x="236"
        y="258"
        width="112"
        height="10"
        rx="5"
        fill="color-mix(in srgb, var(--color-map-pin) 50%, #1a1012)"
        opacity="0.16"
      />
      <circle cx="320" cy="118" r="26" fill="#faf7f2" opacity="0.95" />
      <path
        d="M320 104c-8 0-14 6-14 14 0 10 14 22 14 22s14-12 14-22c0-8-6-14-14-14z"
        fill="var(--color-map-pin)"
      />
      <circle cx="320" cy="116" r="4.5" fill="#faf7f2" />
    </svg>
  )
}
