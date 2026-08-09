import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AccessMode,
  CostOption,
  DayHours,
  ExistingResourceData,
  ExistingResourceLocation,
  HoursAvailability,
  ResourceContactMethod,
} from '@/types/submission'
import type { CostSlice } from '@/features/submissions/cost/costEquality'
import type { ResourceUpdateComparison } from '@/features/submissions/updateRequest/buildResourceUpdateComparison'
import {
  composeResourceUpdateFinalVersion,
  type ComposedResourceUpdateVersion,
} from '@/features/submissions/updateRequest/composeResourceUpdateFinalVersion'
import {
  createStructuredWorkingValues,
  isResourceUpdateStructuredFieldId,
  isStructuredWorkingFieldEdited,
  nonWebsiteContacts,
  RESOURCE_UPDATE_STRUCTURED_FIELD_IDS,
  structuredEditsFromWorking,
  websiteContacts,
  type ResourceUpdateStructuredEdits,
  type ResourceUpdateStructuredFieldId,
  type ResourceUpdateStructuredWorkingValues,
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
  setWebsitesEdit: (websites: ResourceContactMethod[]) => void
  setAccessModeEdit: (accessMode: AccessMode) => void
  setLocationsEdit: (locations: ExistingResourceLocation[]) => void
  setCategoryIdsEdit: (categoryIds: number[]) => void
  setFilterIdsEdit: (filterIds: number[]) => void
  setCostEdit: (slice: CostSlice) => void
  setHoursEdit: (slice: {
    hoursAvailability: HoursAvailability
    hours: DayHours[]
  }) => void
  resetFieldEdit: (fieldId: string) => void
  isFieldEdited: (fieldId: string) => boolean
  getProposedValue: (fieldId: string, originalProposed: string) => string
  getContactsEditorValue: () => ResourceContactMethod[]
  getWebsitesEditorValue: () => ResourceContactMethod[]
  getAccessModeEditorValue: () => AccessMode | null
  getLocationsEditorValue: () => ExistingResourceLocation[]
  getCategoryIdsEditorValue: () => number[]
  getFilterIdsEditorValue: () => number[]
  getCostEditorValue: () => CostSlice
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
 *
 * Structured fields keep a live working draft; “edited” is derived from
 * structural equality to the proposal (not from interaction history).
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
  const [structuredWorking, setStructuredWorking] =
    useState<ResourceUpdateStructuredWorkingValues | null>(null)

  useEffect(() => {
    const next: FieldAcceptanceMap = {}
    for (const id of fieldIds) {
      next[id] = true
    }
    setAccepted(next)
    setEdits({})
    setStructuredWorking(
      proposed ? createStructuredWorkingValues(proposed) : null,
    )
  }, [resetKey, fieldIdsKey, proposed])

  const structuredEdits = useMemo((): ResourceUpdateStructuredEdits => {
    if (!proposed || !structuredWorking) return {}
    return structuredEditsFromWorking(proposed, structuredWorking)
  }, [proposed, structuredWorking])

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

  const setContactsEdit = useCallback((contacts: ResourceContactMethod[]) => {
    const cleaned = nonWebsiteContacts(contacts)
    setStructuredWorking((current) =>
      current ? { ...current, contacts: cleaned } : current,
    )
  }, [])

  const setWebsitesEdit = useCallback((websites: ResourceContactMethod[]) => {
    const cleaned = websiteContacts(websites).map((contact) => ({
      ...contact,
      type: 'website' as const,
    }))
    setStructuredWorking((current) =>
      current ? { ...current, websites: cleaned } : current,
    )
  }, [])

  const setAccessModeEdit = useCallback((accessMode: AccessMode) => {
    setStructuredWorking((current) =>
      current ? { ...current, accessMode } : current,
    )
  }, [])

  const setLocationsEdit = useCallback(
    (locations: ExistingResourceLocation[]) => {
      setStructuredWorking((current) =>
        current ? { ...current, locations } : current,
      )
    },
    [],
  )

  const setCategoryIdsEdit = useCallback((categoryIds: number[]) => {
    setStructuredWorking((current) =>
      current ? { ...current, categoryIds: [...categoryIds] } : current,
    )
  }, [])

  const setFilterIdsEdit = useCallback((filterIds: number[]) => {
    setStructuredWorking((current) =>
      current ? { ...current, filterIds: [...filterIds] } : current,
    )
  }, [])

  const setCostEdit = useCallback((slice: CostSlice) => {
    setStructuredWorking((current) =>
      current
        ? {
            ...current,
            cost: {
              costOption: slice.costOption,
              costDetails: slice.costDetails,
            },
          }
        : current,
    )
  }, [])

  const setHoursEdit = useCallback(
    (slice: { hoursAvailability: HoursAvailability; hours: DayHours[] }) => {
      setStructuredWorking((current) =>
        current
          ? {
              ...current,
              hours: {
                hoursAvailability: slice.hoursAvailability,
                hours: slice.hours,
              },
            }
          : current,
      )
    },
    [],
  )

  const resetFieldEdit = useCallback(
    (fieldId: string) => {
      if (isResourceUpdateStructuredFieldId(fieldId)) {
        if (!proposed) return
        setStructuredWorking((current) => {
          if (!current) return current
          const fromProposed = createStructuredWorkingValues(proposed)
          switch (fieldId) {
            case 'contact:contacts':
              return { ...current, contacts: fromProposed.contacts }
            case 'website:websites':
              return { ...current, websites: fromProposed.websites }
            case 'address:accessMode':
              return { ...current, accessMode: fromProposed.accessMode }
            case 'address:locations':
              return { ...current, locations: fromProposed.locations }
            case 'categories:categories':
              return { ...current, categoryIds: fromProposed.categoryIds }
            case 'categories:filters':
              return { ...current, filterIds: fromProposed.filterIds }
            case 'cost:cost':
              return { ...current, cost: fromProposed.cost }
            case 'hours:hours':
              return { ...current, hours: fromProposed.hours }
            default: {
              const exhaustive: never = fieldId
              return exhaustive
            }
          }
        })
        return
      }
      setEdits((current) => {
        if (!(fieldId in current)) return current
        const next = { ...current }
        delete next[fieldId]
        return next
      })
    },
    [proposed],
  )

  const isStructuredEdited = useCallback(
    (fieldId: ResourceUpdateStructuredFieldId) => {
      if (!proposed || !structuredWorking) return false
      return isStructuredWorkingFieldEdited(
        fieldId,
        proposed,
        structuredWorking,
      )
    },
    [proposed, structuredWorking],
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
    return structuredWorking?.contacts ?? []
  }, [structuredWorking])

  const getWebsitesEditorValue = useCallback((): ResourceContactMethod[] => {
    return structuredWorking?.websites ?? []
  }, [structuredWorking])

  const getAccessModeEditorValue = useCallback((): AccessMode | null => {
    return structuredWorking?.accessMode ?? null
  }, [structuredWorking])

  const getLocationsEditorValue = useCallback((): ExistingResourceLocation[] => {
    return structuredWorking?.locations ?? []
  }, [structuredWorking])

  const getCategoryIdsEditorValue = useCallback((): number[] => {
    return structuredWorking?.categoryIds ?? []
  }, [structuredWorking])

  const getFilterIdsEditorValue = useCallback((): number[] => {
    return structuredWorking?.filterIds ?? []
  }, [structuredWorking])

  const getCostEditorValue = useCallback((): CostSlice => {
    return (
      structuredWorking?.cost ?? {
        costOption: null as CostOption | null,
        costDetails: '',
      }
    )
  }, [structuredWorking])

  const getHoursEditorValue = useCallback(() => {
    return (
      structuredWorking?.hours ?? {
        hoursAvailability: 'structured' as HoursAvailability,
        hours: [] as DayHours[],
      }
    )
  }, [structuredWorking])

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
    for (const id of RESOURCE_UPDATE_STRUCTURED_FIELD_IDS) {
      if (isStructuredEdited(id)) return true
    }
    return false
  }, [
    accepted,
    changedFieldIds,
    edits,
    isStructuredEdited,
    proposedById,
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
    setWebsitesEdit,
    setAccessModeEdit,
    setLocationsEdit,
    setCategoryIdsEdit,
    setFilterIdsEdit,
    setCostEdit,
    setHoursEdit,
    resetFieldEdit,
    isFieldEdited,
    getProposedValue,
    getContactsEditorValue,
    getWebsitesEditorValue,
    getAccessModeEditorValue,
    getLocationsEditorValue,
    getCategoryIdsEditorValue,
    getFilterIdsEditorValue,
    getCostEditorValue,
    getHoursEditorValue,
    selectedCountInSection,
    hasOutcomeChanges,
    composedFinal,
  }
}
