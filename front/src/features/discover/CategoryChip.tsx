import { cn } from '@/utils/cn'

interface CategoryChipProps {
  label: string
  isSelected: boolean
  onToggle: () => void
}

export function CategoryChip({ label, isSelected, onToggle }: CategoryChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onToggle}
      className={cn(
        'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-sm',
        'transition-[color,background-color,border-color,box-shadow] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive focus-visible:ring-offset-1',
        isSelected
          ? 'border-interactive bg-interactive text-interactive-foreground hover:bg-interactive-hover hover:border-interactive-hover'
          : 'border-border/80 bg-white text-foreground hover:border-interactive/35 hover:shadow-md',
      )}
    >
      {label}
    </button>
  )
}
