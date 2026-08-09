import { ConfirmDialog } from '@/features/submissions/form/ConfirmDialog'
import type { ManagedUser } from '@/types/user'

type EnableDisableMode = 'enable' | 'disable'

interface EnableDisableDialogProps {
  open: boolean
  mode: EnableDisableMode
  user: ManagedUser | null
  isSubmitting?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Confirms setting a staff account active or inactive.
 */
export function EnableDisableDialog({
  open,
  mode,
  user,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: EnableDisableDialogProps) {
  if (!user) return null

  const isDisable = mode === 'disable'

  return (
    <ConfirmDialog
      open={open}
      title={isDisable ? 'Set Inactive?' : 'Set Active?'}
      description={
        isDisable
          ? 'This user will no longer be able to sign in until their account is set back to active.'
          : 'This user will be able to sign in again with their existing credentials.'
      }
      cancelLabel="Cancel"
      confirmLabel={isDisable ? 'Set Inactive' : 'Set Active'}
      isSubmitting={isSubmitting}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
