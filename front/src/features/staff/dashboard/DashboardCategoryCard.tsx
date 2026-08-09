import {
  DashboardCategoryBarChart,
  type CategoryChartSegment,
} from '@/features/staff/dashboard/DashboardCategoryBarChart'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

interface DashboardCategoryCardProps {
  segments: CategoryChartSegment[]
  isLoading?: boolean
  /** When true (and not loading), show an unavailable state instead of bars. */
  unavailable?: boolean
}

/**
 * Analytics card wrapping the resources-by-category bar chart.
 */
export function DashboardCategoryCard({
  segments,
  isLoading = false,
  unavailable = false,
}: DashboardCategoryCardProps) {
  const showUnavailable = !isLoading && unavailable

  return (
    <Card>
      <CardHeader className="gap-1.5">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Resources by Category
        </h3>
        <p className="text-sm text-muted-foreground">
          See how resources are distributed across categories.
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div
            className="flex h-[calc(6*2rem+5*0.75rem)] flex-col gap-3"
            role="status"
            aria-label="Loading resources by category"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="grid h-8 shrink-0 grid-cols-[7.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_3rem] sm:gap-4"
              >
                <div className="h-4 w-20 animate-pulse rounded-md bg-muted sm:w-24" />
                <div className="h-2.5 animate-pulse rounded-full bg-muted/40 sm:h-3" />
                <div className="ml-auto h-4 w-6 animate-pulse rounded-md bg-muted" />
              </div>
            ))}
          </div>
        ) : showUnavailable ? (
          <div
            className="flex h-[calc(6*2rem+5*0.75rem)] items-center justify-center"
            role="status"
            aria-label="Resources by category unavailable"
          >
            <p className="font-heading text-3xl font-bold tabular-nums text-muted-foreground">
              —
            </p>
          </div>
        ) : (
          <DashboardCategoryBarChart segments={segments} />
        )}
      </CardContent>
    </Card>
  )
}
