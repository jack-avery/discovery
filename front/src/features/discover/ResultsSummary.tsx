import { Loader2 } from 'lucide-react'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'

interface ResultsSummaryProps {
  totalItems: number
  isLoading?: boolean
  error?: string | null
}

function formatCount(totalItems: number): string {
  if (totalItems === 1) return '1 resource'
  return `${totalItems} resources`
}

export function ResultsSummary({
  totalItems,
  isLoading = false,
  error = null,
}: ResultsSummaryProps) {
  const title = isLoading ? (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      Loading results…
    </span>
  ) : error ? (
    'Results unavailable'
  ) : (
    formatCount(totalItems)
  )

  return (
    <WorkspaceSection
      title={title}
      aria-label="Results summary"
      divider
    />
  )
}
