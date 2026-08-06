import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  DayHours,
  ExistingResourceData,
  ExistingResourceLocation,
  HoursAvailability,
  ResourceContactMethod,
} from '@/types/submission'
import type { ResourceUpdateComparison } from '@/features/submissions/updateRequest/buildResourceUpdateComparison'
import {
  composeResourceUpdateFinalVersion,
  type ComposedResourceUpdateVersion,
} from '@/features/submissions/updateRequest/composeResourceUpdateFinalVersion'
import {
  areContactEditorEqual,
  areHoursSlicesEqual,
  areLocationSlicesEqual,
  isResourceUpdateStructuredFieldId,
  nonWebsiteContacts,
  type ResourceUpdateStructuredEdits,
  type ResourceUpdateStructuredFieldId,
} from '@/features/submissions/updateRequest/resourceUpdateStructuredFields'

export type FieldAcceptanceMap = Record<string, boolean>
export type FieldEditMap = Record<string, string>

export interface ResourceUpdateAcceptanceState {
  accepted: FieldAcceptanceMap
  edits: FieldEditMap
  structuredEdits: ResourceUpdateStructuredEdits
  totalCount: number
  selectedCount: number
  allSelected: boolean
  setFieldAccepted: (fieldId: string, accepted: boolean) => void
  setFieldEdit: (fieldId: string, value: string) => void
  setContactsEdit: (contacts: ResourceContactMethod[]) => void
  setLocationsEdit: (locations: ExistingResourceLocation[]) => void
  setHoursEdit: (slice: {
    hoursAvailability: HoursAvailability
    hours: DayHours[]
  }) => void
  resetFieldEdit: (fieldId: string) => void
  isFieldEdited: (fieldId: string) => boolean
  getProposedValue: (fieldId: string, originalProposed: string) => string
  getContactsEditorValue: () => ResourceContactMethod[]
  getLocationsEditorValue: () => ExistingResourceLocation[]
  getHoursEditorValue: () => {
    hoursAvailability: HoursAvailability
    hours: DayHours[]
  }
  selectedCountInSection: (fieldIds: string[]) => number
  /**
   * True when the reviewer rejected a changed field or edited any value.
   */
  hasOutcomeChanges: boolean
  composedFinal: ComposedResourceUpdateVersion | null
}

/**
 * Moderator field acceptance + local edits for a Resource Update comparison.
 * Defaults every field to accepted; resets when the comparison identity changes.
 */
export function useResourceUpdateAcceptance(
  comparison: ResourceUpdateComparison | null,
  resetKey: string | number,
  baseline: ExistingResourceData | null = null,
  proposed: ExistingResourceData | null = null,
): ResourceUpdateAcceptanceState {
  const fieldIds = useMemo(() => {
    if (!comparison) return [] as string[]
    return comparison.sections.flatMap((section) =>
      section.fields.map((field) => field.id),
    )
  }, [comparison])

  const proposedById = useMemo(() => {
    const map: Record<string, string> = {}
    if (!comparison) return map
    for (const section of comparison.sections) {
      for (const field of section.fields) {
        map[field.id] = field.proposed
      }
    }
    return map
  }, [comparison])

  const changedFieldIds = useMemo(() => {
    if (!comparison) return [] as string[]
    return comparison.sections.flatMap((section) =>
      section.fields.filter((field) => field.changed).map((field) => field.id),
    )
  }, [comparison])

  const fieldIdsKey = fieldIds.join('|')

  const [accepted, setAccepted] = useState<FieldAcceptanceMap>({})
  const [edits, setEdits] = useState<FieldEditMap>({})
  const [structuredEdits, setStructuredEdits] =
    useState<ResourceUpdateStructuredEdits>({})

  useEffect(() => {
    const next: FieldAcceptanceMap = {}
    for (const id of fieldIds) {
      next[id] = true
    }
    setAccepted(next)
    setEdits({})
    setStructuredEdits({})
  }, [resetKey, fieldIdsKey])

  const setFieldAccepted = useCallback((fieldId: string, value: boolean) => {
    setAccepted((current) => ({ ...current, [fieldId]: value }))
  }, [])

  const setFieldEdit = useCallback(
    (fieldId: string, value: string) => {
      if (isResourceUpdateStructuredFieldId(fieldId)) return
      setEdits((current) => {
        const original = proposedById[fieldId]
        // Exact match only — trim-equality would drop trailing spaces while typing
        // (e.g. "Hello " → trim → "Hello" === original → edit discarded).
        if (original != null && value === original) {
          if (!(fieldId in current)) return current
          const next = { ...current }
          delete next[fieldId]
          return next
        }
        return { ...current, [fieldId]: value }
      })
    },
    [proposedById],
  )

  const setContactsEdit = useCallback(
    (contacts: ResourceContactMethod[]) => {
      if (!proposed) return
      const cleaned = nonWebsiteContacts(contacts)
      setStructuredEdits((current) => {
        const next = { ...current }
        if (
          areContactEditorEqual(
            cleaned,
            nonWebsiteContacts(proposed.contacts),
          )
        ) {
          delete next['contact:contacts']
        } else {
          next['contact:contacts'] = cleaned
        }
        return next
      })
    },
    [proposed],
  )

  const setLocationsEdit = useCallback(
    (locations: ExistingResourceLocation[]) => {
      if (!proposed) return
      setStructuredEdits((current) => {
        const next = { ...current }
        if (areLocationSlicesEqual(locations, proposed.locations)) {
          delete next['address:locations']
        } else {
          next['address:locations'] = locations
        }
        return next
      })
    },
    [proposed],
  )

  const setHoursEdit = useCallback(
    (slice: { hoursAvailability: HoursAvailability; hours: DayHours[] }) => {
      if (!proposed) return
      setStructuredEdits((current) => {
        const next = { ...current }
        if (
          areHoursSlicesEqual(slice, {
            hoursAvailability: proposed.hoursAvailability,
            hours: proposed.hours,
          })
        ) {
          delete next['hours:hours']
        } else {
          next['hours:hours'] = {
            hoursAvailability: slice.hoursAvailability,
            hours: slice.hours,
          }
        }
        return next
      })
    },
    [proposed],
  )

  const resetFieldEdit = useCallback((fieldId: string) => {
    if (isResourceUpdateStructuredFieldId(fieldId)) {
      setStructuredEdits((current) => {
        if (!(fieldId in current)) return current
        const next = { ...current }
        delete next[fieldId]
        return next
      })
      return
    }
    setEdits((current) => {
      if (!(fieldId in current)) return current
      const next = { ...current }
      delete next[fieldId]
      return next
    })
  }, [])

  const isStructuredEdited = useCallback(
    (fieldId: ResourceUpdateStructuredFieldId) => {
      if (!proposed || !(fieldId in structuredEdits)) return false
      switch (fieldId) {
        case 'contact:contacts': {
          const edited = structuredEdits['contact:contacts']
          if (!edited) return false
          return !areContactEditorEqual(
            nonWebsiteContacts(edited),
            nonWebsiteContacts(proposed.contacts),
          )
        }
        case 'address:locations': {
          const edited = structuredEdits['address:locations']
          if (!edited) return false
          return !areLocationSlicesEqual(edited, proposed.locations)
        }
        case 'hours:hours': {
          const edited = structuredEdits['hours:hours']
          if (!edited) return false
          return !areHoursSlicesEqual(edited, {
            hoursAvailability: proposed.hoursAvailability,
            hours: proposed.hours,
          })
        }
        default:
          return false
      }
    },
    [proposed, structuredEdits],
  )

  const isFieldEdited = useCallback(
    (fieldId: string) => {
      if (isResourceUpdateStructuredFieldId(fieldId)) {
        return isStructuredEdited(fieldId)
      }
      const edited = edits[fieldId]
      if (edited == null) return false
      const effective = edited.trim() || 'Not provided'
      return effective !== proposedById[fieldId]
    },
    [edits, isStructuredEdited, proposedById],
  )

  const getProposedValue = useCallback(
    (fieldId: string, originalProposed: string) =>
      edits[fieldId] ?? originalProposed,
    [edits],
  )

  const getContactsEditorValue = useCallback((): ResourceContactMethod[] => {
    if (!proposed) return []
    if (structuredEdits['contact:contacts']) {
      return structuredEdits['contact:contacts']
    }
    return nonWebsiteContacts(proposed.contacts)
  }, [proposed, structuredEdits])

  const getLocationsEditorValue = useCallback((): ExistingResourceLocation[] => {
    if (!proposed) return []
    if (structuredEdits['address:locations']) {
      return structuredEdits['address:locations']
    }
    return proposed.locations
  }, [proposed, structuredEdits])

  const getHoursEditorValue = useCallback(() => {
    if (!proposed) {
      return {
        hoursAvailability: 'structured' as HoursAvailability,
        hours: [] as DayHours[],
      }
    }
    if (structuredEdits['hours:hours']) {
      return structuredEdits['hours:hours']
    }
    return {
      hoursAvailability: proposed.hoursAvailability,
      hours: proposed.hours,
    }
  }, [proposed, structuredEdits])

  const totalCount = fieldIds.length
  const selectedCount = fieldIds.reduce(
    (count, id) => count + (accepted[id] !== false ? 1 : 0),
    0,
  )
  const allSelected = totalCount === 0 || selectedCount === totalCount

  const selectedCountInSection = useCallback(
    (sectionFieldIds: string[]) =>
      sectionFieldIds.reduce(
        (count, id) => count + (accepted[id] !== false ? 1 : 0),
        0,
      ),
    [accepted],
  )

  const hasOutcomeChanges = useMemo(() => {
    for (const id of changedFieldIds) {
      if (accepted[id] === false) return true
    }
    for (const [id, value] of Object.entries(edits)) {
      const effective = value.trim() || 'Not provided'
      if (effective !== proposedById[id]) return true
    }
    for (const id of Object.keys(structuredEdits)) {
      if (
        isResourceUpdateStructuredFieldId(id) &&
        isStructuredEdited(id)
      ) {
        return true
      }
    }
    return false
  }, [
    accepted,
    changedFieldIds,
    edits,
    isStructuredEdited,
    proposedById,
    structuredEdits,
  ])

  const composedFinal = useMemo(() => {
    if (!comparison || !proposed) return null
    return composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      accepted,
      edits,
      structuredEdits,
    )
  }, [accepted, baseline, comparison, edits, proposed, structuredEdits])

  return {
    accepted,
    edits,
    structuredEdits,
    totalCount,
    selectedCount,
    allSelected,
    setFieldAccepted,
    setFieldEdit,
    setContactsEdit,
    setLocationsEdit,
    setHoursEdit,
    resetFieldEdit,
    isFieldEdited,
    getProposedValue,
    getContactsEditorValue,
    getLocationsEditorValue,
    getHoursEditorValue,
    selectedCountInSection,
    hasOutcomeChanges,
    composedFinal,
  }
}
