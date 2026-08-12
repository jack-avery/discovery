import { useEffect } from 'react'

/**
 * Non-modal tour accessibility: Escape closes the tour, but focus is not
 * trapped in the coachmark so users can interact with the spotlight target.
 */
export function useTourEscape(args: {
  active: boolean
  onEscape: () => void
}): void {
  const { active, onEscape } = args

  useEffect(() => {
    if (!active) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onEscape()
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [active, onEscape])
}
