import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import {
  createEmptyContribution,
  createEmptySubmissionDraft,
} from '../constants/contributionTypes'
import { createEmptyContributorInfo } from '../contributor/emptyState'
import { createEmptyExistingResourceData } from '../existingResource/emptyState'
import { createEmptyEventData } from '../event/emptyState'
import { createEmptySkillsServicesData } from '../skillsServices/emptyState'
import {
  clearStoredDraft,
  createDraftAutosave,
  hasStoredDraft,
  readStoredDraft,
  SUBMISSION_DRAFT_STORAGE_KEY,
  writeStoredDraft,
} from './draftStorage'
import {
  isMeaningfulContribution,
  isMeaningfulDraft,
} from './draftMeaningfulness'
import type { SubmissionDraft } from '@/types/submission'
import { SUBMISSION_DRAFT_SCHEMA_VERSION } from '@/types/submission'

/** In-memory localStorage for node:test (no browser). */
function installMemoryLocalStorage() {
  const store = new Map<string, string>()
  const memory = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
    get length() {
      return store.size
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: memory,
  })
  return store
}

function rawKey(): string | null {
  return localStorage.getItem(SUBMISSION_DRAFT_STORAGE_KEY)
}

function emptyDraft(): SubmissionDraft {
  return createEmptySubmissionDraft()
}

function withContributor(
  patch: Partial<ReturnType<typeof createEmptyContributorInfo>>,
): SubmissionDraft {
  const draft = emptyDraft()
  draft.contributor = { ...createEmptyContributorInfo(), ...patch }
  return draft
}

function draftWithContribution(
  contribution: ReturnType<typeof createEmptyContribution>,
): SubmissionDraft {
  const draft = emptyDraft()
  draft.contributions = [contribution]
  return draft
}

describe('isMeaningfulDraft', () => {
  it('treats a completely empty default draft as not meaningful', () => {
    assert.equal(isMeaningfulDraft(emptyDraft()), false)
  })

  it('treats whitespace-only contributor data as not meaningful', () => {
    assert.equal(
      isMeaningfulDraft(
        withContributor({
          name: '   ',
          email: '\t',
          phone: ' ',
          relationshipOther: '  ',
        }),
      ),
      false,
    )
  })

  it('treats contributor-only real input as meaningful', () => {
    assert.equal(
      isMeaningfulDraft(withContributor({ name: 'Ada Lovelace' })),
      true,
    )
    assert.equal(
      isMeaningfulDraft(withContributor({ email: 'ada@example.com' })),
      true,
    )
    assert.equal(
      isMeaningfulDraft(withContributor({ preferredContactMethod: 'email' })),
      true,
    )
    assert.equal(
      isMeaningfulDraft(withContributor({ relationship: 'volunteer' })),
      true,
    )
  })

  it('treats an empty/default contribution object as not meaningful', () => {
    const resource = createEmptyContribution('existing_resource')
    const skills = createEmptyContribution('community_asset')
    const event = createEmptyContribution('event')

    assert.equal(isMeaningfulContribution(resource), false)
    assert.equal(isMeaningfulContribution(skills), false)
    assert.equal(isMeaningfulContribution(event), false)
    assert.equal(isMeaningfulDraft(draftWithContribution(resource)), false)
    assert.equal(isMeaningfulDraft(draftWithContribution(skills)), false)
    assert.equal(isMeaningfulDraft(draftWithContribution(event)), false)
  })

  it('treats a real Existing Resource contribution as meaningful', () => {
    const contribution = createEmptyContribution('existing_resource')
    contribution.data = {
      ...createEmptyExistingResourceData(),
      name: 'Community Fridge',
    }
    assert.equal(isMeaningfulContribution(contribution), true)
    assert.equal(isMeaningfulDraft(draftWithContribution(contribution)), true)
  })

  it('treats a real Skills/Services contribution as meaningful', () => {
    const contribution = createEmptyContribution('community_asset')
    contribution.data = {
      ...createEmptySkillsServicesData(),
      title: 'Weekend tutoring',
    }
    assert.equal(isMeaningfulContribution(contribution), true)
    assert.equal(isMeaningfulDraft(draftWithContribution(contribution)), true)
  })

  it('treats a real Event contribution as meaningful', () => {
    const contribution = createEmptyContribution('event')
    contribution.data = {
      ...createEmptyEventData(),
      name: 'Park cleanup',
    }
    assert.equal(isMeaningfulContribution(contribution), true)
    assert.equal(isMeaningfulDraft(draftWithContribution(contribution)), true)
  })

  it('does not treat UI-only draft flags as meaningful', () => {
    const draft = emptyDraft()
    draft.ui = {
      ...draft.ui,
      showTypePicker: true,
      showContributorEditor: true,
      showReview: true,
      editor: {
        mode: 'create',
        type: 'existing_resource',
        contributionId: null,
      },
    }
    assert.equal(isMeaningfulDraft(draft), false)
  })
})

describe('draftStorage persistence invariant', () => {
  beforeEach(() => {
    installMemoryLocalStorage()
  })

  afterEach(() => {
    clearStoredDraft()
  })

  it('does not leave the storage key when writing a non-meaningful draft', () => {
    writeStoredDraft(emptyDraft())
    assert.equal(rawKey(), null)
    assert.equal(hasStoredDraft(), false)
  })

  it('clears an existing key when a later write is non-meaningful', () => {
    const meaningful = withContributor({ name: 'Kept then cleared' })
    writeStoredDraft(meaningful)
    assert.ok(rawKey())

    writeStoredDraft(emptyDraft())
    assert.equal(rawKey(), null)
    assert.equal(hasStoredDraft(), false)
  })

  it('does not treat an existing empty/junk v7 draft as stored', () => {
    localStorage.setItem(
      SUBMISSION_DRAFT_STORAGE_KEY,
      JSON.stringify(emptyDraft()),
    )
    assert.equal(hasStoredDraft(), false)
    assert.equal(readStoredDraft(), null)
  })

  it('cleans empty/junk v7 drafts from localStorage on read', () => {
    localStorage.setItem(
      SUBMISSION_DRAFT_STORAGE_KEY,
      JSON.stringify(emptyDraft()),
    )
    readStoredDraft()
    assert.equal(rawKey(), null)
  })

  it('cleans malformed draft JSON on read', () => {
    localStorage.setItem(SUBMISSION_DRAFT_STORAGE_KEY, '{not-json')
    assert.equal(readStoredDraft(), null)
    assert.equal(rawKey(), null)
  })

  it('cleans incompatible schema versions on read', () => {
    const draft = emptyDraft()
    draft.meta.version = SUBMISSION_DRAFT_SCHEMA_VERSION - 1
    draft.contributor = { ...draft.contributor, name: 'Legacy' }
    localStorage.setItem(SUBMISSION_DRAFT_STORAGE_KEY, JSON.stringify(draft))
    assert.equal(readStoredDraft(), null)
    assert.equal(rawKey(), null)
  })

  it('simulates visit /submit → no edits → unmount → no stored draft', () => {
    // Provider starts with empty draft and unmount calls writeStoredDraft.
    writeStoredDraft(emptyDraft())
    assert.equal(rawKey(), null)
    assert.equal(hasStoredDraft(), false)
  })

  it('simulates Discard → unmount → no stored draft', () => {
    writeStoredDraft(withContributor({ email: 'real@example.com' }))
    assert.equal(hasStoredDraft(), true)

    clearStoredDraft()
    writeStoredDraft(emptyDraft()) // unmount after discard
    assert.equal(rawKey(), null)
    assert.equal(hasStoredDraft(), false)
  })

  it('persists a real draft across unmount and remount (restore banner path)', () => {
    const draft = withContributor({ name: 'Recover me' })
    writeStoredDraft(draft) // unmount
    assert.equal(hasStoredDraft(), true)

    const restored = readStoredDraft() // remount / hasStoredDraft
    assert.ok(restored)
    assert.equal(restored.contributor.name, 'Recover me')
  })

  it('Continue restores a legitimate draft via readStoredDraft', () => {
    const contribution = createEmptyContribution('existing_resource')
    contribution.data = {
      ...createEmptyExistingResourceData(),
      description: 'Hot meals on Fridays',
    }
    const draft = draftWithContribution(contribution)
    writeStoredDraft(draft)

    const continued = readStoredDraft()
    assert.ok(continued)
    assert.equal(continued.contributions.length, 1)
    assert.equal(continued.contributions[0]?.data.kind, 'existing_resource')
    if (continued.contributions[0]?.data.kind === 'existing_resource') {
      assert.equal(
        continued.contributions[0].data.description,
        'Hot meals on Fridays',
      )
    }
  })

  it('simulates successful submission → unmount → draft remains cleared', () => {
    writeStoredDraft(withContributor({ name: 'Before submit' }))
    clearStoredDraft()
    // Success path keeps persistence off; even if unmount wrote, empty is cleared.
    writeStoredDraft(emptyDraft())
    assert.equal(rawKey(), null)
    assert.equal(hasStoredDraft(), false)
  })

  it('simulates startNewSubmission → no edits → unmount → no draft', () => {
    clearStoredDraft()
    writeStoredDraft(emptyDraft())
    assert.equal(hasStoredDraft(), false)
  })

  it('Strict Mode-style mount → unmount → remount does not create a draft', () => {
    // First mount cleanup (Strict Mode) writes empty draft.
    writeStoredDraft(emptyDraft())
    assert.equal(hasStoredDraft(), false)

    // Remount checks hasStoredDraft — must stay false and storage empty.
    assert.equal(rawKey(), null)
    writeStoredDraft(emptyDraft())
    assert.equal(hasStoredDraft(), false)
  })

  it('debounced autosave flush clears storage for empty drafts', () => {
    let current = emptyDraft()
    const autosave = createDraftAutosave(() => current, { debounceMs: 10_000 })
    current = withContributor({ name: 'Temp' })
    autosave.schedule()
    autosave.flush()
    assert.equal(hasStoredDraft(), true)

    current = emptyDraft()
    autosave.flush()
    assert.equal(hasStoredDraft(), false)
    assert.equal(rawKey(), null)
    autosave.dispose()
  })
})
