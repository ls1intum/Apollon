import type { CSSProperties, MouseEvent, ReactNode } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"

type MenuShellProps = {
  /** Id for the trigger button — wired to aria-controls */
  buttonId: string
  /** Id for the menu popup element */
  menuId: string
  /** Anchor element; null when closed. Non-null means the menu is open. */
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
  /** Classes for the wrapping <div> around the trigger + menu */
  wrapperClassName?: string
  /** Which edge of the button the menu aligns to. Defaults to "right". */
  anchorHorizontal?: "left" | "right"
  /** Extra class for the menu popup (controls width, etc.). */
  menuWidthClassName?: string
  /** Padding utility for the menu popup. Defaults to "p-1.5". */
  menuPaperPaddingClassName?: string
  /** Border-radius utility for the menu popup. Defaults to "rounded-lg". */
  menuPaperRadiusClassName?: string
  /** The menu body (items, sections, etc.). */
  children: ReactNode
}

/**
 * Shared trigger-button + dropdown-menu chrome used by the dashboard dropdowns.
 * Owns the accessibility wiring, alignment, and popup styling so the popover
 * look-and-feel lives in one place; callers supply the menu body.
 *
 * The open state is still driven by the caller-owned `anchorEl` (non-null =
 * open) so existing gallery state and tests keep working. The trigger button's
 * click flows through `onToggle`; outside-click / Escape closing flows through
 * `onClose`.
 */
export const MenuShell = ({
  buttonId,
  menuId,
  anchorEl,
  onToggle,
  onClose,
  triggerContent,
  triggerClassName,
  triggerAriaLabel,
  triggerStyle,
  wrapperClassName = "relative",
  anchorHorizontal = "right",
  menuWidthClassName = "min-w-[220px]",
  menuPaperPaddingClassName = "p-1.5",
  menuPaperRadiusClassName = "rounded-lg",
  children,
}: MenuShellProps) => {
  const isOpen = Boolean(anchorEl)

  return (
    <div className={wrapperClassName}>
      <DropdownMenu
        open={isOpen}
        onOpenChange={(open) => {
          // Base UI fires this on outside-click / Escape / item-select. The
          // trigger's own toggle is handled by onToggle below; here we only
          // react to a request to close.
          if (!open) onClose()
        }}
      >
        <DropdownMenuTrigger
          render={
            <button
              id={buttonId}
              type="button"
              aria-controls={isOpen ? menuId : undefined}
              aria-label={triggerAriaLabel}
              onClick={onToggle}
              className={triggerClassName}
              style={triggerStyle}
            />
          }
        >
          {triggerContent}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          id={menuId}
          aria-labelledby={buttonId}
          align={anchorHorizontal === "left" ? "start" : "end"}
          sideOffset={8}
          className={`${menuPaperRadiusClassName} border border-border-subtle bg-card ${menuPaperPaddingClassName} text-foreground shadow-sm transition-colors duration-200 ${menuWidthClassName}`}
        >
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
