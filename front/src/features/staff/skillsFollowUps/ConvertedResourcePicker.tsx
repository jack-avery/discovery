import { useEffect, useId, useRef, useState } from 'react'
import { Button, Input } from '@/components/ui'
import {
  buildConvertedResourceSearchParams,
  CONVERTED_RESOURCE_SEARCH_DEBOUNCE_MS,
  CONVERTED_RESOURCE_SEARCH_MIN_CHARS,
  mergeConvertedResourceSearchPages,
  shouldSearchConvertedResources,
} from '@/services/skillsFollowUpService'
import { fetchResources } from '@/services/resourceService'
import type { Resource } from '@/types/resource'
import { toUserFacingErrorMessage } from '@/utils/userFacingError'
import { cn } from '@/utils/cn'

export interface ConvertedResourceSelection {
  resource_id: number
  name: string
  resource_type: string | null
}

interface ConvertedResourcePickerProps {
  /**
   * Notifies the parent whenever the current selection changes
   * (select, Change, or clear). Does not PATCH.
   */
  onSelectionChange: (selection: ConvertedResourceSelection | null) => void
  isSaving?: boolean
  /**
   * Optional seed when changing an existing link — shown as selected until
   * Change is used.
   */
  initialSelection?: ConvertedResourceSelection | null
}

/**
 * Server-backed resource search/selection for Skills Follow-up conversion.
 * Parent dialog owns Cancel / confirm actions — this component never PATCHes.
 */
export function ConvertedResourcePicker({
  onSelectionChange,
  isSaving = false,
  initialSelection = null,
}: ConvertedResourcePickerProps) {
  const searchInputId = useId()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<Resource[]>([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ConvertedResourceSelection | null>(
    initialSelection,
  )
  const requestSerialRef = useRef(0)

  useEffect(() => {
    onSelectionChange(selected)
  }, [selected, onSelectionChange])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, CONVERTED_RESOURCE_SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [query])

  useEffect(() => {
    if (selected !== null) return

    if (!shouldSearchConvertedResources(debouncedQuery)) {
      setResults([])
      setPage(1)
      setHasNext(false)
      setError(null)
      setIsLoading(false)
      return
    }

    const serial = ++requestSerialRef.current
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)
    setPage(1)

    const params = buildConvertedResourceSearchParams(debouncedQuery, 1)
    fetchResources(
      {
        search: params.search,
        page: params.page,
        perPage: params.perPage,
      },
      { signal: controller.signal },
    )
      .then((result) => {
        if (serial !== requestSerialRef.current) return
        setResults(result.resources)
        setHasNext(result.pagination.has_next)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        if (serial !== requestSerialRef.current) return
        setResults([])
        setHasNext(false)
        setIsLoading(false)
        setError(
          toUserFacingErrorMessage(err, {
            fallback: "We couldn't search resources. Please try again.",
            context: 'converted-resource-search',
          }),
        )
      })

    return () => {
      controller.abort()
    }
  }, [debouncedQuery, selected])

  const handleSelectResult = (resource: Resource) => {
    setSelected({
      resource_id: resource.resource_id,
      name: resource.name || 'Untitled resource',
      resource_type: resource.resource_type,
    })
    setQuery('')
    setDebouncedQuery('')
    setResults([])
    setHasNext(false)
    setError(null)
  }

  const handleChangeSelection = () => {
    setSelected(null)
    setQuery('')
    setDebouncedQuery('')
    setResults([])
    setPage(1)
    setHasNext(false)
    setError(null)
  }

  const handleLoadMore = async () => {
    if (
      selected !== null ||
      !shouldSearchConvertedResources(debouncedQuery) ||
      !hasNext ||
      isLoadingMore
    ) {
      return
    }
    const nextPage = page + 1
    const serial = requestSerialRef.current
    setIsLoadingMore(true)
    try {
      const params = buildConvertedResourceSearchParams(
        debouncedQuery,
        nextPage,
      )
      const result = await fetchResources({
        search: params.search,
        page: params.page,
        perPage: params.perPage,
      })
      if (serial !== requestSerialRef.current) return
      setResults((prev) =>
        mergeConvertedResourceSearchPages(prev, result.resources),
      )
      setPage(nextPage)
      setHasNext(result.pagination.has_next)
    } catch (err: unknown) {
      if (serial !== requestSerialRef.current) return
      setError(
        toUserFacingErrorMessage(err, {
          fallback: "We couldn't load more resources. Please try again.",
          context: 'converted-resource-search-more',
        }),
      )
    } finally {
      if (serial === requestSerialRef.current) {
        setIsLoadingMore(false)
      }
    }
  }

  const trimmedQuery = query.trim()

  return (
    <div className="min-w-0 space-y-2.5" role="group" aria-label="Resource search">
      {selected ? (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            Linked resource
          </p>
          <p className="mt-1 font-heading text-sm font-semibold text-foreground">
            {selected.name}
          </p>
          {selected.resource_type ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selected.resource_type}
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-8 px-2"
            disabled={isSaving}
            onClick={handleChangeSelection}
          >
            Change
          </Button>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor={searchInputId} className="sr-only">
              Search resources by name
            </label>
            <Input
              id={searchInputId}
              value={query}
              disabled={isSaving}
              placeholder="Search resources by name…"
              autoComplete="off"
              aria-controls={listId}
              aria-expanded={results.length > 0}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {trimmedQuery.length < CONVERTED_RESOURCE_SEARCH_MIN_CHARS ? (
            <p className="text-xs text-muted-foreground" role="status">
              Enter at least {CONVERTED_RESOURCE_SEARCH_MIN_CHARS} characters to
              search.
            </p>
          ) : null}

          {isLoading ? (
            <p className="text-xs text-muted-foreground" role="status">
              Searching…
            </p>
          ) : null}

          {error ? (
            <p className="text-xs text-danger" role="alert">
              {error}
            </p>
          ) : null}

          {!isLoading &&
          !error &&
          shouldSearchConvertedResources(debouncedQuery) &&
          results.length === 0 ? (
            <p className="text-xs text-muted-foreground" role="status">
              No resources match that search.
            </p>
          ) : null}

          {results.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              aria-label="Matching resources"
              className="m-0 max-h-52 list-none space-y-1 overflow-y-auto p-0 scrollbar-thin"
            >
              {results.map((resource) => (
                <li key={resource.resource_id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    disabled={isSaving}
                    onClick={() => handleSelectResult(resource)}
                    className={cn(
                      'flex w-full flex-col rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors focus-ring',
                      'hover:bg-muted/50',
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {resource.name || 'Untitled resource'}
                    </span>
                    {resource.resource_type ? (
                      <span className="mt-0.5 text-xs text-muted-foreground">
                        {resource.resource_type}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {hasNext && results.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              disabled={isSaving || isLoadingMore}
              onClick={() => {
                void handleLoadMore()
              }}
            >
              {isLoadingMore ? 'Loading…' : 'Load more'}
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}
