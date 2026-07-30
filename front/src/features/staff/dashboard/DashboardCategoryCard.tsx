import {
  DashboardCategoryBarChart,
  type CategoryChartSegment,
} from '@/features/staff/dashboard/DashboardCategoryBarChart'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

interface DashboardCategoryCardProps {
  segments: CategoryChartSegment[]
}

export function DashboardCategoryCard({ segments }: DashboardCategoryCardProps) {
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
        <DashboardCategoryBarChart segments={segments} />
      </CardContent>
    </Card>
  )
}
