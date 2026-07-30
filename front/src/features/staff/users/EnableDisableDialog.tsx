import { ConfirmDialog } from '@/features/submissions/form/ConfirmDialog'
import type { ManagedUser } from '@/types/user'

type EnableDisableMode = 'enable' | 'disable'

interface EnableDisableDialogProps {
  open: boolean
  mode: EnableDisableMode
  user: ManagedUser | null
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Confirms enabling or disabling a staff account.
 */
export function EnableDisableDialog({
  open,
  mode,
  user,
  onCancel,
  onConfirm,
}: EnableDisableDialogProps) {
  if (!user) return null

  const isDisable = mode === 'disable'

  return (
    <ConfirmDialog
      open={open}
      title={isDisable ? 'Disable User?' : 'Enable User?'}
      description={
        isDisable
          ? 'This user will no longer be able to sign in until their account is re-enabled.'
          : 'This user will be able to sign in again with their existing credentials.'
      }
      cancelLabel="Cancel"
      confirmLabel={isDisable ? 'Disable User' : 'Enable User'}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
