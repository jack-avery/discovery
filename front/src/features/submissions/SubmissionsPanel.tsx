import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { Card, CardContent, CardHeader } from '@/components/ui'

export function SubmissionsPanel() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Submitted resources
          </h2>
          <Badge variant="pending">Moderation queue</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Community-submitted resources awaiting review will appear here.
        </p>
      </CardHeader>
      <CardContent>
        <EmptyState
          title="No submissions in queue"
          description="When community members submit new resources, pending items will be listed here for moderation."
          icon={<FileText className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
        />
      </CardContent>
    </Card>
  )
}
