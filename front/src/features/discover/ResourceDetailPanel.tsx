import { useEffect } from 'react'
import { FileText, X } from 'lucide-react'
import { useSelection } from '@/app/providers/SelectionProvider'
import { OverlayPanel } from '@/components/shared/OverlayPanel'
import { EmptyState } from '@/components/shared'
import { Button } from '@/components/ui'
import { useMediaQuery } from '@/hooks'

export function ResourceDetailPanel() {
  const { selectedResourceId, clearSelection } = useSelection()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isOpen = selectedResourceId !== null

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <OverlayPanel
      isOpen={isOpen}
      onClose={clearSelection}
      title="Resource details"
      mobileSheet={isMobile}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Resource details
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearSelection}
          aria-label="Close resource details"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <EmptyState
          title="Details not available"
          description="Information for the selected resource will appear here once the API is connected."
          icon={<FileText className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
          className="py-12"
        />
      </div>
    </OverlayPanel>
  )
}
