import type { CSSProperties, MouseEvent, ReactNode } from "react"
import MenuItem from "@mui/material/MenuItem"
import { MenuShell } from "./MenuShell"

export type ActionMenuItem = {
  key: string
  label: string
  icon?: ReactNode
  /** Adds a separator line above this item */
  dividerAbove?: boolean
  /** Styles the item as a destructive action */
  variant?: "default" | "danger"
  onSelect: () => void
}

type ActionMenuProps = {
  /** Id for the trigger button — wired to aria-controls */
  buttonId: string
  /** Id for the MUI Menu element */
  menuId: string
  /** MUI anchor element; null when closed */
  anchorEl: HTMLElement | null
  /** Called when the button is clicked. The parent stores anchorEl. */
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void
  onClose: () => void
  /** Content rendered inside the trigger button */
  triggerContent: ReactNode
  /** Tailwind / CSS classes applied to the trigger button */
  triggerClassName: string
  /** Accessible name for the trigger button */
  triggerAriaLabel?: string
  /** Inline styles for the trigger button */
  triggerStyle?: CSSProperties
  items: ActionMenuItem[]
  /** Which edge of the button the menu aligns to. Defaults to "right". */
  anchorHorizontal?: "left" | "right"
  /** Extra class for the MUI Paper (controls width, etc.). */
  menuWidthClassName?: string
}

export const ActionMenu = ({
  buttonId,
  menuId,
  anchorEl,
  onToggle,
  onClose,
  triggerContent,
  triggerClassName,
  triggerAriaLabel,
  triggerStyle,
  items,
  anchorHorizontal = "right",
  menuWidthClassName = "min-w-[220px]",
}: ActionMenuProps) => {
  return (
    <MenuShell
      buttonId={buttonId}
      menuId={menuId}
      anchorEl={anchorEl}
      onToggle={onToggle}
      onClose={onClose}
      triggerContent={triggerContent}
      triggerClassName={triggerClassName}
      triggerAriaLabel={triggerAriaLabel}
      triggerStyle={triggerStyle}
      anchorHorizontal={anchorHorizontal}
      menuWidthClassName={menuWidthClassName}
    >
      {items.map((item) => (
        <div key={item.key}>
          {item.dividerAbove && (
            <div className="my-1 h-px bg-[var(--home-border-subtle)]" />
          )}
          <MenuItem
            onClick={() => {
              item.onSelect()
              onClose()
            }}
            className={`home-filter-menu-item !min-h-0 !rounded-md !px-3 !py-2 !text-sm !font-normal transition-colors duration-150 ${
              item.variant === "danger"
                ? "home-filter-menu-item-delete !text-[var(--apollon-alert-danger-color)] hover:!bg-[var(--apollon-alert-danger-background)]"
                : "!text-[var(--home-text-primary)] hover:!bg-[var(--home-surface-raised-hover)]"
            }`}
          >
            {item.icon && (
              <span
                className="mr-3 flex h-4 w-4 shrink-0 items-center justify-center text-[var(--home-accent-base)]"
                aria-hidden="true"
              >
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
          </MenuItem>
        </div>
      ))}
    </MenuShell>
  )
}
