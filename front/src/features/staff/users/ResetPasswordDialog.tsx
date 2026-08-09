import { ConfirmDialog } from '@/features/submissions/form/ConfirmDialog'
import { userDisplayName } from '@/features/staff/users/userDisplay'
import type { ManagedUser } from '@/types/user'

interface ResetPasswordDialogProps {
  open: boolean
  user: ManagedUser | null
  isSubmitting?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Confirms issuing a new one-time password setup link for a staff user.
 */
export function ResetPasswordDialog({
  open,
  user,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: ResetPasswordDialogProps) {
  if (!user) return null

  const name = userDisplayName(user)

  return (
    <ConfirmDialog
      open={open}
      title="Reset Password?"
      description={
        <>
          <p>
            Reset password for <span className="font-medium text-foreground">{name}</span>?
          </p>
          <p>
            A new one-time password setup link will be generated. Their current
            password will continue to work until they set a new password using
            the link.
          </p>
          <p>
            You’ll need to copy the link and send it to them so they can set
            their new password. The link will not be sent automatically.
          </p>
        </>
      }
      cancelLabel="Cancel"
      confirmLabel="Reset Password"
      isSubmitting={isSubmitting}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
