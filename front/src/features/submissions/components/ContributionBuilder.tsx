import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { ContributionCard } from './ContributionCard'
import { ContributionTypePicker } from './ContributionTypePicker'
import { ContributionEditorSheet } from './ContributionEditorSheet'
import { useSubmissionDraft } from '../state/SubmissionDraftProvider'
import { CONTRIBUTION_TYPE_META } from '../constants/contributionTypes'

export function ContributionBuilder() {
  const {
    draft,
    beginCreateContribution,
    beginEditContribution,
    closeEditor,
    saveEditorContribution,
    openTypePicker,
    closeTypePicker,
    removeContribution,
  } = useSubmissionDraft()

  const { contributions, ui } = draft
  const isEmpty = contributions.length === 0
  const showTypePicker = isEmpty || ui.showTypePicker
  const editor = ui.editor
  const editorMeta = editor ? CONTRIBUTION_TYPE_META[editor.type] : null

  return (
    <section
      aria-labelledby={
        showTypePicker
          ? 'contribution-type-picker-heading'
          : 'contribution-builder-heading'
      }
      className="space-y-10"
    >
      {!isEmpty ? (
        <div className="mx-auto w-full max-w-3xl space-y-5">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
            <div className="space-y-1">
              <h2
                id="contribution-builder-heading"
                className="font-heading text-xl font-semibold tracking-tight text-foreground"
              >
                Your contributions
              </h2>
              <p className="text-sm text-muted-foreground">
                Review what you&apos;ve added. You can edit or remove items
                before continuing later.
              </p>
            </div>

            {!ui.showTypePicker ? (
              <Button
                type="button"
                variant="interactive"
                onClick={openTypePicker}
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                Add another contribution
              </Button>
            ) : null}
          </div>

          <ul className="space-y-3 text-left">
            {contributions.map((contribution) => (
              <li key={contribution.id}>
                <ContributionCard
                  contribution={contribution}
                  onEdit={() => beginEditContribution(contribution.id)}
                  onDelete={() => removeContribution(contribution.id)}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ContributionTypePicker
        visible={showTypePicker}
        showCancel={!isEmpty && ui.showTypePicker}
        onCancel={closeTypePicker}
        onSelect={beginCreateContribution}
      />

      <ContributionEditorSheet
        open={editor !== null}
        title={
          editorMeta
            ? editor?.mode === 'edit'
              ? `Edit ${editorMeta.label}`
              : editorMeta.label
            : 'Contribution'
        }
        description={
          editorMeta
            ? 'Form fields for this contribution type will appear here in a later milestone.'
            : undefined
        }
        onClose={closeEditor}
        onSave={saveEditorContribution}
        saveLabel={editor?.mode === 'edit' ? 'Save changes' : 'Save contribution'}
      >
        {editorMeta ? (
          <div className="rounded-xl border border-border-subtle bg-muted px-5 py-8 text-center">
            <p className="font-heading text-base font-semibold text-foreground">
              {editorMeta.label} editor
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              This is the reusable editor surface. Selecting a type opens this
              sheet. Saving will add a summary card to your submission; closing
              without saving will not.
            </p>
          </div>
        ) : null}
      </ContributionEditorSheet>
    </section>
  )
}
