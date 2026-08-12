import { useEffect, useId, useState } from 'react'
import { useBlocker } from 'react-router'
import { Button } from '@/components/ui'
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility'
import { useSubmissionDraft } from '@/features/submissions/state/SubmissionDraftProvider'
import {
  attachBeforeUnloadGuard,
  shouldBlockSubmissionNavigation,
  SUBMISSION_IN_PROGRESS_NAV_MESSAGE,
} from '@/features/submissions/state/submissionNavigationGuard'

/**
 * Prevents in-app navigation away from Contribute while a submission batch
 * is in flight, so the workflow can finish and apply existing success/partial
 * handling instead of unmounting mid-POST.
 */
export function SubmissionNavigationGuard() {
  const { isSubmitting } = useSubmissionDraft()
  const blocker = useBlocker(shouldBlockSubmissionNavigation(isSubmitting))
  const [showBlockedNotice, setShowBlockedNotice] = useState(false)
  const titleId = useId()
  const descriptionId = useId()
  const containerRef = useDialogAccessibility({
    open: showBlockedNotice,
    onDismiss: () => setShowBlockedNotice(false),
  })

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowBlockedNotice(true)
    }
  }, [blocker.state])

  useEffect(() => {
    if (!isSubmitting) {
      setShowBlockedNotice(false)
      if (blocker.state === 'blocked') {
        blocker.reset()
      }
    }
  }, [isSubmitting, blocker])

  useEffect(() => {
    if (!isSubmitting) return
    return attachBeforeUnloadGuard()
  }, [isSubmitting])

  const dismissBlockedNotice = () => {
    setShowBlockedNotice(false)
    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }

  if (!showBlockedNotice) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-surface-overlay"
        aria-label="Dismiss"
        tabIndex={-1}
        onClick={dismissBlockedNotice}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-lg"
      >
        <h2
          id={titleId}
          className="font-heading text-lg font-semibold text-foreground"
        >
          Submission in progress
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
          {SUBMISSION_IN_PROGRESS_NAV_MESSAGE}
        </p>
        <div className="mt-5 flex justify-end">
          <Button type="button" variant="primary" onClick={dismissBlockedNotice}>
            OK
          </Button>
        </div>
      </div>
    </div>
  )
}
