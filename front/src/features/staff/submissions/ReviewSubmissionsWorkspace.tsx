import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
} from 'lucide-react'
import { EmptyState } from '@/components/shared'
import { Button } from '@/components/ui'
import { RejectSubmissionDialog } from '@/features/staff/submissions/RejectSubmissionDialog'
import { ReviewActionBar } from '@/features/staff/submissions/ReviewActionBar'
import { SubmissionDetailDispatcher } from '@/features/staff/submissions/SubmissionDetailDispatcher'
import { SubmissionInfoSection } from '@/features/staff/submissions/SubmissionInfoSection'
import { SubmissionQueueList } from '@/features/staff/submissions/SubmissionQueueList'
import { SubmissionQueueToolbar } from '@/features/staff/submissions/SubmissionQueueToolbar'
import {
  nextQueueSelection,
  type ReviewContributionKind,
  type ReviewQueueSort,
} from '@/features/staff/submissions/fetchReviewQueue'
import { parseReviewQueueFiltersFromSearchParams } from '@/features/staff/submissions/reviewQueueNavigation'
import { useReviewSubmission } from '@/hooks/useReviewSubmission'
import { useSubmissionDetail } from '@/hooks/useSubmissionDetail'
import { useSubmissionQueue } from '@/hooks/useSubmissionQueue'
import { cn } from '@/utils/cn'

/**
 * Two-column staff workspace: pending queue + contribution presentation review.
 */
export function ReviewSubmissionsWorkspace() {
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<ReviewContributionKind[]>(() => {
    return parseReviewQueueFiltersFromSearchParams(searchParams) ?? []
  })
  const [sort, setSort] = useState<ReviewQueueSort>('newest')
  const { items, isLoading, error, reload, removeItem } = useSubmissionQueue(
    filters,
    sort,
  )
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const { submission, isLoading: detailLoading, error: detailError } =
    useSubmissionDetail(selectedId)
  const {
    isSubmitting,
    error: reviewError,
    submitDecision,
    clearError,
  } = useReviewSubmission()

  // Apply contribution-type filters when navigating from dashboard KPI links.
  useEffect(() => {
    const parsed = parseReviewQueueFiltersFromSearchParams(searchParams)
    if (parsed != null) {
      setFilters(parsed)
    }
  }, [searchParams])

  // Keep selection valid when the queue changes (filter/sort/reload/moderation).
  useEffect(() => {
    if (isLoading) return
    if (items.length === 0) {
      setSelectedId(null)
      return
    }
    if (
      selectedId == null ||
      !items.some((item) => item.submission_id === selectedId)
    ) {
      setSelectedId(items[0].submission_id)
    }
  }, [items, isLoading, selectedId])

  const resourceName =
    submission?.proposed_version?.name?.trim() ||
    items.find((item) => item.submission_id === selectedId)
      ?.proposed_resource_name?.trim() ||
    'this submission'

  async function handleApprove() {
    if (selectedId == null) return
    clearError()
    setStatusMessage(null)

    const nextId = nextQueueSelection(items, selectedId)
    const result = await submitDecision(selectedId, 'approved')
    if (!result) return

    setStatusMessage(`“${resourceName}” was approved and published.`)
    setRejectOpen(false)
    removeItem(selectedId)
    setSelectedId(nextId === selectedId ? null : nextId)
    reload()
  }

  async function handleRejectConfirm(notes: string) {
    if (selectedId == null) return
    clearError()
    setStatusMessage(null)

    const nextId = nextQueueSelection(items, selectedId)
    const result = await submitDecision(selectedId, 'rejected', notes)
    if (!result) return

    setRejectOpen(false)
    setStatusMessage(`“${resourceName}” was rejected.`)
    removeItem(selectedId)
    setSelectedId(nextId === selectedId ? null : nextId)
    reload()
  }

  if (isLoading && items.length === 0) {
    return (
      <div
        className="flex h-full min-h-[16rem] items-center justify-center"
        role="status"
        aria-label="Loading submission queue"
      >
        <Loader2
          className="h-6 w-6 animate-spin text-interactive"
          aria-hidden="true"
        />
        <span className="sr-only">Loading submission queue</span>
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <div className="flex h-full min-h-[16rem] items-center justify-center">
        <EmptyState
          title="Unable to load submissions"
          description={error}
          icon={<AlertCircle className="h-6 w-6 text-danger" strokeWidth={1.5} />}
          action={
            <Button type="button" variant="interactive" size="sm" onClick={reload}>
              Refresh queue
            </Button>
          }
        />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        {statusMessage ? <StatusBanner message={statusMessage} /> : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
          <SubmissionQueueToolbar
            filters={filters}
            sort={sort}
            onFiltersChange={(next) => {
              setStatusMessage(null)
              setFilters(next)
            }}
            onSortChange={(next) => {
              setStatusMessage(null)
              setSort(next)
            }}
            count={0}
          />
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              title="You're all caught up!"
              description="There are no submissions waiting for review."
              icon={
                <ClipboardList
                  className="h-6 w-6 text-muted-foreground"
                  strokeWidth={1.5}
                />
              }
              action={
                <Button
                  type="button"
                  variant="interactive"
                  size="sm"
                  onClick={() => {
                    setStatusMessage(null)
                    reload()
                  }}
                >
                  Refresh queue
                </Button>
              }
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {statusMessage ? <StatusBanner message={statusMessage} /> : null}
      {reviewError ? (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {reviewError}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
          <SubmissionQueueToolbar
            filters={filters}
            sort={sort}
            onFiltersChange={(next) => {
              setStatusMessage(null)
              setSelectedId(null)
              setFilters(next)
            }}
            onSortChange={(next) => {
              setStatusMessage(null)
              setSort(next)
            }}
            count={items.length}
          />
          <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
            <SubmissionQueueList
              items={items}
              selectedId={selectedId}
              onSelect={(id) => {
                clearError()
                setStatusMessage(null)
                setSelectedId(id)
              }}
            />
          </div>
        </aside>

        <section
          className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface"
          aria-label="Submission review"
        >
          {selectedId == null ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                title="Select a submission"
                description="Choose a submission from the queue to review its details."
                icon={
                  <FileText
                    className="h-6 w-6 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                }
              />
            </div>
          ) : detailLoading ? (
            <div
              className="flex flex-1 items-center justify-center"
              role="status"
              aria-label="Loading submission details"
            >
              <Loader2
                className="h-6 w-6 animate-spin text-interactive"
                aria-hidden="true"
              />
              <span className="sr-only">Loading submission details</span>
            </div>
          ) : detailError ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                title="Unable to load submission"
                description={detailError}
                icon={
                  <AlertCircle className="h-6 w-6 text-danger" strokeWidth={1.5} />
                }
              />
            </div>
          ) : submission?.proposed_version ? (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                <div className="workspace-content !gap-3">
                  <SubmissionInfoSection
                    submission={submission}
                    contributionKind={
                      items.find((item) => item.submission_id === selectedId)
                        ?.contributionKind
                    }
                  />
                  <SubmissionDetailDispatcher submission={submission} />
                </div>
              </div>
              <ReviewActionBar
                isSubmitting={isSubmitting}
                onReject={() => {
                  clearError()
                  setRejectOpen(true)
                }}
                onApprove={handleApprove}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                title="Submission incomplete"
                description="This submission does not include a proposed resource version to review."
                icon={
                  <FileText
                    className="h-6 w-6 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                }
              />
            </div>
          )}
        </section>
      </div>

      <RejectSubmissionDialog
        open={rejectOpen}
        resourceName={resourceName}
        isSubmitting={isSubmitting}
        onCancel={() => {
          if (!isSubmitting) setRejectOpen(false)
        }}
        onConfirm={handleRejectConfirm}
      />
    </div>
  )
}

function StatusBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-xl border border-success/25 bg-success/10 px-3 py-2.5 text-sm text-foreground',
      )}
    >
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-success"
        strokeWidth={2}
        aria-hidden="true"
      />
      <p>{message}</p>
    </div>
  )
}
