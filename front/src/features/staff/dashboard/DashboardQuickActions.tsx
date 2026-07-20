import { DashboardQuickAction } from '@/features/staff/dashboard/DashboardQuickAction'
import type { PlaceholderQuickAction } from '@/features/staff/dashboard/placeholderData'

interface DashboardQuickActionsProps {
  actions: PlaceholderQuickAction[]
}

export function DashboardQuickActions({ actions }: DashboardQuickActionsProps) {
  return (
    <section aria-labelledby="dashboard-quick-actions-heading">
      <h3
        id="dashboard-quick-actions-heading"
        className="mb-4 font-heading text-base font-semibold text-foreground"
      >
        Quick Actions
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <DashboardQuickAction key={action.id} action={action} />
        ))}
      </div>
    </section>
  )
}
