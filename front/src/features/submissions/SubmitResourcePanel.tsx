import { PlusCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { EmptyState } from '@/components/shared'

export function SubmitResourcePanel() {
  return (
    <Card>
      <CardContent className="py-8">
        <EmptyState
          title="Submission form coming soon"
          description="Share a community resource with the Rideau-Rockcliffe area. The submission form will be available once connected to the backend."
          icon={<PlusCircle className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
        />
      </CardContent>
    </Card>
  )
}
