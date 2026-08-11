import { useCallback, useState } from 'react'
import { useAbortableQuery } from '@/hooks/useAbortableQuery'
import {
  EMPTY_SKILLS_FOLLOW_UP_LIST,
  fetchSkillsFollowUps,
  SKILLS_FOLLOW_UPS_PAGE_SIZE,
} from '@/services/skillsFollowUpService'
import type {
  ListSkillsFollowUpsQuery,
  SkillsFollowUpSort,
  SkillsFollowUpStatus,
} from '@/types/skillsFollowUp'

export interface SkillsFollowUpsFilters {
  status?: SkillsFollowUpStatus | 'all'
  sort?: SkillsFollowUpSort
  page?: number
  limit?: number
}

function toQuery(filters: SkillsFollowUpsFilters): ListSkillsFollowUpsQuery {
  return {
    status: filters.status && filters.status !== 'all' ? filters.status : undefined,
    sort: filters.sort ?? 'newest',
    page: filters.page ?? 1,
    limit: filters.limit ?? SKILLS_FOLLOW_UPS_PAGE_SIZE,
  }
}

function filtersKey(filters: SkillsFollowUpsFilters): string {
  return JSON.stringify({
    status: filters.status ?? 'all',
    sort: filters.sort ?? 'newest',
    page: filters.page ?? 1,
    limit: filters.limit ?? SKILLS_FOLLOW_UPS_PAGE_SIZE,
  })
}

/**
 * Staff Skills Follow-ups list — GET /skills-follow-ups via skillsFollowUpService.
 */
export function useSkillsFollowUps(filters: SkillsFollowUpsFilters = {}) {
  const [reloadKey, setReloadKey] = useState(0)
  const query = toQuery(filters)
  const key = filtersKey(filters)

  const { data, isLoading, error } = useAbortableQuery(
    (signal) => fetchSkillsFollowUps(query, { signal }),
    {
      initialData: EMPTY_SKILLS_FOLLOW_UP_LIST,
      fallbackErrorMessage:
        "We couldn't load skills follow-ups. Please try again.",
      deps: [key, reloadKey],
    },
  )

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1)
  }, [])

  return {
    items: data.items,
    pagination: data.meta,
    isLoading,
    error,
    reload,
  }
}
