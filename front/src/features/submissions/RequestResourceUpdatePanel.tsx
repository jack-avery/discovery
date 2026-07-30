import { RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { EmptyState } from '@/components/shared'

/**
 * Placeholder for the standalone Update Resource page.
 *
 * TODO(update-resource): Rename RequestResourceUpdatePanel when aligning
 * internal names with product terminology.
 */
export function RequestResourceUpdatePanel() {
  return (
    <Card>
      <CardContent className="py-8">
        <EmptyState
          title="Update Resource form coming soon"
          description="Suggest improvements to an existing community resource listing. The Update Resource form will be available once connected to the backend."
          icon={<RefreshCw className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
        />
      </CardContent>
    </Card>
  )
}
