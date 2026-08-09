import { useId, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui'
import { buildSetupPasswordUrl } from '@/services/userService'
import { userDisplayName } from '@/features/staff/users/userDisplay'
import type { ManagedUser } from '@/types/user'
import { cn } from '@/utils/cn'

export interface SetupLinkDialogProps {
  open: boolean
  /**
   * Context for copy — create vs reset.
   */
  mode: 'create' | 'reset'
  /** Recipient shown in the share instructions. */
  user: Pick<ManagedUser, 'first_name' | 'last_name' | 'email'> | null
  token: string | null
  expiresInHours: number
  onClose: () => void
}

/**
 * One-time setup link presentation after create or admin password reset.
 * Token lives only in React state for this dialog — never persisted.
 */
export function SetupLinkDialog({
  open,
  mode,
  user,
  token,
  expiresInHours,
  onClose,
}: SetupLinkDialogProps) {
  const titleId = useId()
  const descId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)

  if (!open || !token || !user) return null

  const setupUrl = buildSetupPasswordUrl(token)
  const name = userDisplayName(user as ManagedUser)
  const title =
    mode === 'create' ? 'Account created' : 'Password setup link ready'
  const expiryLabel = `${expiresInHours} hour${expiresInHours === 1 ? '' : 's'}`
  const description =
    mode === 'create' ? (
      <>
        <p>The account for {name} has been created successfully.</p>
        <p>
          Copy the setup link below and send it to them so they can create
          their password. The link expires in {expiryLabel} and can only be
          used once.
        </p>
      </>
    ) : (
      <>
        <p>A new password setup link is ready for {name}.</p>
        <p>
          Copy the setup link below and send it to them so they can create
          their password. The link expires in {expiryLabel} and can only be
          used once.
        </p>
      </>
    )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(setupUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      inputRef.current?.select()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-surface-overlay"
        aria-label="Dismiss"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          'relative z-10 flex w-full flex-col',
          'rounded-t-2xl border border-border bg-surface shadow-lg',
          'sm:max-w-lg sm:rounded-2xl',
        )}
      >
        <header className="shrink-0 border-b border-border px-5 py-4">
          <h2
            id={titleId}
            className="font-heading text-lg font-semibold text-foreground"
          >
            {title}
          </h2>
          <div id={descId} className="mt-2 space-y-2 text-sm text-muted-foreground">
            {description}
          </div>
        </header>

        <div className="space-y-3 px-5 py-4">
          <label
            htmlFor="setup-link-url"
            className="block text-sm font-medium text-foreground"
          >
            Setup link
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="setup-link-url"
              type="text"
              readOnly
              value={setupUrl}
              className={cn(
                'h-10 min-w-0 flex-1 rounded-lg border border-border bg-muted/40 px-3',
                'font-mono text-xs text-foreground',
              )}
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              onClick={() => void handleCopy()}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy link
                </>
              )}
            </Button>
          </div>
        </div>

        <footer className="flex shrink-0 justify-end border-t border-border px-5 py-4">
          <Button type="button" variant="interactive" onClick={onClose}>
            Done
          </Button>
        </footer>
      </div>
    </div>
  )
}
