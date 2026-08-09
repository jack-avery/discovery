import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui'
import { userDisplayName } from '@/features/staff/users/userDisplay'
import type { ManagedUser } from '@/types/user'
import { cn } from '@/utils/cn'

interface MenuPosition {
  top: number
  left: number
  minWidth: number
}

interface UserActionsMenuProps {
  user: ManagedUser
  isCurrentUser: boolean
  onEdit: () => void
  onResetPassword: () => void
  onDisable: () => void
  onEnable: () => void
}

/**
 * Per-row overflow menu for User Management.
 * Portaled like MultiSelectDropdown so table overflow does not clip it.
 */
export function UserActionsMenu({
  user,
  isCurrentUser,
  onEdit,
  onResetPassword,
  onDisable,
  onEnable,
}: UserActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const name = userDisplayName(user)

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPosition(null)
      return
    }

    const gutter = 12

    function updatePosition() {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const menu = menuRef.current
      const menuWidth = menu?.getBoundingClientRect().width ?? 11 * 16
      let left = rect.right - menuWidth

      if (left < gutter) left = gutter
      if (left + menuWidth > window.innerWidth - gutter) {
        left = Math.max(gutter, window.innerWidth - gutter - menuWidth)
      }

      setMenuPosition({
        top: rect.bottom + 4,
        left,
        minWidth: Math.max(rect.width, 11 * 16),
      })
    }

    updatePosition()
    const rafId = window.requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setIsOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setIsOpen(false)
      triggerRef.current?.querySelector('button')?.focus()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const runAndClose = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  const menu =
    isOpen && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={`Actions for ${name}`}
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              minWidth: menuPosition.minWidth,
              zIndex: 50,
            }}
            className="rounded-lg border border-border bg-surface py-1 shadow-md"
          >
            <MenuItem
              label="Edit User"
              onSelect={() => runAndClose(onEdit)}
            />
            <MenuItem
              label="Reset Password"
              onSelect={() => runAndClose(onResetPassword)}
            />
            {!isCurrentUser && user.is_active ? (
              <MenuItem
                label="Set Inactive"
                tone="danger"
                onSelect={() => runAndClose(onDisable)}
              />
            ) : null}
            {!isCurrentUser && !user.is_active ? (
              <MenuItem
                label="Set Active"
                onSelect={() => runAndClose(onEnable)}
              />
            ) : null}
          </div>,
          document.body,
        )
      : null

  return (
    <div ref={containerRef} className="relative inline-flex justify-end">
      <div ref={triggerRef}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${name}`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          className="h-8 w-8 min-h-0 min-w-0"
          onClick={() => setIsOpen((open) => !open)}
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      {menu}
    </div>
  )
}

function MenuItem({
  label,
  onSelect,
  tone = 'default',
}: {
  label: string
  onSelect: () => void
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex w-full px-3 py-2 text-left text-sm transition-colors',
        'hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
        tone === 'danger' ? 'text-danger' : 'text-foreground',
      )}
      onClick={onSelect}
    >
      {label}
    </button>
  )
}
