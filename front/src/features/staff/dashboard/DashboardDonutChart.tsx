export interface DonutChartSegment {
  label: string
  value: number
  color: string
}

interface DashboardDonutChartProps {
  segments: DonutChartSegment[]
  /** Outer diameter in pixels. */
  size?: number
  /** Ring thickness in pixels. */
  thickness?: number
  /** Show percentage labels centred on each segment. */
  showLabels?: boolean
  className?: string
}

function segmentMidpoint(
  center: number,
  radius: number,
  midFraction: number,
): { x: number; y: number } {
  const angleDeg = midFraction * 360 - 90
  const angleRad = (angleDeg * Math.PI) / 180
  return {
    x: center + radius * Math.cos(angleRad),
    y: center + radius * Math.sin(angleRad),
  }
}

/**
 * SVG donut chart for category distribution. Accepts static segment data today;
 * swap in API-driven segments in a later milestone.
 */
export function DashboardDonutChart({
  segments,
  size = 200,
  thickness = 36,
  showLabels = true,
  className,
}: DashboardDonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  const center = size / 2
  const radius = (size - thickness) / 2
  const labelRadius = radius
  const circumference = 2 * Math.PI * radius

  let cumulative = 0

  const arcs =
    total === 0
      ? []
      : segments.map((segment) => {
          const fraction = segment.value / total
          const dash = fraction * circumference
          const gap = circumference - dash
          const offset = cumulative * circumference
          const midFraction = cumulative + fraction / 2
          const percent = donutSegmentPercent(segment.value, total)
          cumulative += fraction

          return {
            label: segment.label,
            color: segment.color,
            dash,
            gap,
            offset,
            midFraction,
            percent,
          }
        })

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label="Resources by category chart"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--ds-border-subtle)"
        strokeWidth={thickness}
      />
      {arcs.map((arc) => (
        <circle
          key={arc.label}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={arc.color}
          strokeWidth={thickness}
          strokeDasharray={`${arc.dash} ${arc.gap}`}
          strokeDashoffset={-arc.offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      ))}
      {showLabels && total > 0
        ? arcs.map((arc) => {
            const point = segmentMidpoint(center, labelRadius, arc.midFraction)
            return (
              <text
                key={`label-${arc.label}`}
                x={point.x}
                y={point.y}
                fill="#ffffff"
                fontSize={11}
                fontWeight={600}
                textAnchor="middle"
                dominantBaseline="middle"
                aria-hidden="true"
              >
                {arc.percent}%
              </text>
            )
          })
        : null}
    </svg>
  )
}

export function donutSegmentPercent(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}
