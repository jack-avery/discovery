import {
  DashboardDonutChart,
  donutSegmentPercent,
  type DonutChartSegment,
} from '@/features/staff/dashboard/DashboardDonutChart'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

const CHART_SIZE = 200

interface DashboardCategoryCardProps {
  segments: DonutChartSegment[]
}

export function DashboardCategoryCard({ segments }: DashboardCategoryCardProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  return (
    <Card>
      <CardHeader className="gap-1.5">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Resources by Category
        </h3>
        <p className="text-sm text-muted-foreground">
          Distribution of published resources across all categories.
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-stretch">
          <div className="flex shrink-0 justify-center md:justify-start">
            <DashboardDonutChart
              segments={segments}
              size={CHART_SIZE}
              className="shrink-0"
            />
          </div>

          <ul
            className="flex min-w-0 flex-1 flex-col justify-between gap-3 md:gap-0"
            style={{ minHeight: CHART_SIZE }}
            aria-label="Category legend"
          >
            {segments.map((segment) => {
              const percent = donutSegmentPercent(segment.value, total)
              return (
                <li
                  key={segment.label}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: segment.color }}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-foreground">
                      {segment.label}
                    </span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap tabular-nums text-sm text-muted-foreground">
                    {segment.value} ({percent}%)
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
