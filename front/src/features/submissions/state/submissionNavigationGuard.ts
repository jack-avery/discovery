/** Shown when route navigation is blocked during an active submission batch. */
export const SUBMISSION_IN_PROGRESS_NAV_MESSAGE =
  'Your contributions are being submitted. Please wait until submission is complete before leaving this page.'

/** Route / browser guards use the shared in-flight submission flag. */
export function shouldBlockSubmissionNavigation(isSubmitting: boolean): boolean {
  return isSubmitting
}

/**
 * Registers the standard beforeunload guard while a submission batch is active.
 * Returns a disposer; safe to call when `window` is unavailable (SSR/tests).
 */
export function attachBeforeUnloadGuard(): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handler = (event: BeforeUnloadEvent) => {
    event.preventDefault()
  }

  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}
