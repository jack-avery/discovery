import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  attachBeforeUnloadGuard,
  shouldBlockSubmissionNavigation,
  SUBMISSION_IN_PROGRESS_NAV_MESSAGE,
} from './submissionNavigationGuard'

describe('shouldBlockSubmissionNavigation', () => {
  it('does not block when isSubmitting is false', () => {
    assert.equal(shouldBlockSubmissionNavigation(false), false)
  })

  it('blocks when isSubmitting is true', () => {
    assert.equal(shouldBlockSubmissionNavigation(true), true)
  })
})

describe('SUBMISSION_IN_PROGRESS_NAV_MESSAGE', () => {
  it('explains that submission must finish before leaving', () => {
    assert.match(
      SUBMISSION_IN_PROGRESS_NAV_MESSAGE,
      /being submitted/i,
    )
    assert.match(
      SUBMISSION_IN_PROGRESS_NAV_MESSAGE,
      /wait until submission is complete/i,
    )
  })
})

describe('attachBeforeUnloadGuard', () => {
  const listeners = new Map<string, Set<EventListener>>()

  afterEach(() => {
    listeners.clear()
    delete (globalThis as { window?: unknown }).window
  })

  function installMockWindow() {
    const windowMock = {
      addEventListener(type: string, listener: EventListener) {
        if (!listeners.has(type)) listeners.set(type, new Set())
        listeners.get(type)!.add(listener)
      },
      removeEventListener(type: string, listener: EventListener) {
        listeners.get(type)?.delete(listener)
      },
    }
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: windowMock,
    })
    return windowMock
  }

  it('registers beforeunload only while submitting and removes on cleanup', () => {
    installMockWindow()
    const dispose = attachBeforeUnloadGuard()
    assert.equal(listeners.get('beforeunload')?.size, 1)

    dispose()
    assert.equal(listeners.get('beforeunload')?.size ?? 0, 0)
  })

  it('calls preventDefault on beforeunload while active', () => {
    installMockWindow()
    attachBeforeUnloadGuard()
    const handler = [...(listeners.get('beforeunload') ?? [])][0] as (
      event: BeforeUnloadEvent,
    ) => void

    let prevented = false
    handler({
      preventDefault() {
        prevented = true
      },
    } as BeforeUnloadEvent)

    assert.equal(prevented, true)
  })

  it('returns a no-op disposer when window is unavailable', () => {
    delete (globalThis as { window?: unknown }).window
    assert.doesNotThrow(() => attachBeforeUnloadGuard()())
  })
})

describe('submission navigation lifecycle expectations', () => {
  it('allows navigation after successful submission resolves', () => {
    let isSubmitting = true
    assert.equal(shouldBlockSubmissionNavigation(isSubmitting), true)

    isSubmitting = false
    assert.equal(shouldBlockSubmissionNavigation(isSubmitting), false)
  })

  it('allows navigation after partial or failed submission resolves', () => {
    let isSubmitting = true
    assert.equal(shouldBlockSubmissionNavigation(isSubmitting), true)

    isSubmitting = false
    assert.equal(shouldBlockSubmissionNavigation(isSubmitting), false)
  })

  it('blocks navigation for the full in-flight window', () => {
    const phases: boolean[] = []
    let isSubmitting = false

    phases.push(shouldBlockSubmissionNavigation(isSubmitting))
    isSubmitting = true
    phases.push(shouldBlockSubmissionNavigation(isSubmitting))
    isSubmitting = false
    phases.push(shouldBlockSubmissionNavigation(isSubmitting))

    assert.deepEqual(phases, [false, true, false])
  })
})
