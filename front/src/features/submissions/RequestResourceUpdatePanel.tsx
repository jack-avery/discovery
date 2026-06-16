import { RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { EmptyState } from '@/components/shared'

export function RequestResourceUpdatePanel() {
  return (
    <Card>
      <CardContent className="py-8">
        <EmptyState
          title="Update request form coming soon"
          description="Request changes to an existing community resource listing. The update request form will be available once connected to the backend."
          icon={<RefreshCw className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
        />
      </CardContent>
    </Card>
  )
}
