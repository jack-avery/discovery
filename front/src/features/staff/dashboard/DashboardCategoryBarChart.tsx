import { useEffect, useState } from 'react'

export interface CategoryChartSegment {
  label: string
  value: number
  color: string
}

interface DashboardCategoryBarChartProps {
  segments: CategoryChartSegment[]
}

/**
 * Horizontal bar chart for published resource counts by category.
 * Bars use a single theme colour (`bg-primary`) and animate in on first render.
 * List viewport is fixed to ~6 rows so the card height stays stable.
 */
export function DashboardCategoryBarChart({
  segments,
}: DashboardCategoryBarChartProps) {
  const [animateIn, setAnimateIn] = useState(false)
  const sorted = [...segments].sort((a, b) => b.value - a.value)
  const max = Math.max(...sorted.map((segment) => segment.value), 0)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAnimateIn(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <ul
      // 6 × h-8 rows + 5 × gap-3 → fixed viewport; overflow scrolls the list only
      className="flex h-[calc(6*2rem+5*0.75rem)] flex-col gap-3 overflow-y-auto overscroll-contain pr-1 scrollbar-thin"
      aria-label="Resources by category"
    >
      {sorted.map((segment) => {
        const widthPercent =
          max > 0
            ? Math.max((segment.value / max) * 100, segment.value > 0 ? 2 : 0)
            : 0

        return (
          <li
            key={segment.label}
            className="grid h-8 shrink-0 grid-cols-[7.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_3rem] sm:gap-4"
          >
            <span className="truncate text-sm font-semibold text-foreground">
              {segment.label}
            </span>

            <div
              className="h-2.5 min-w-0 overflow-hidden rounded-full bg-muted/40 sm:h-3"
              role="presentation"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                style={{
                  width: animateIn ? `${widthPercent}%` : '0%',
                }}
              />
            </div>

            <span className="text-right text-sm tabular-nums text-muted-foreground">
              {segment.value}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
