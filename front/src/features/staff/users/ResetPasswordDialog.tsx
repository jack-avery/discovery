import { ConfirmDialog } from '@/features/submissions/form/ConfirmDialog'
import type { ManagedUser } from '@/types/user'

interface ResetPasswordDialogProps {
  open: boolean
  user: ManagedUser | null
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Confirms resetting a staff user password to the org default.
 */
export function ResetPasswordDialog({
  open,
  user,
  onCancel,
  onConfirm,
}: ResetPasswordDialogProps) {
  if (!user) return null

  return (
    <ConfirmDialog
      open={open}
      title="Reset Password?"
      description="This will reset the user's password to the organization's default password. The user will be required to change it the next time they sign in."
      cancelLabel="Cancel"
      confirmLabel="Reset Password"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
