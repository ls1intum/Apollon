import type { CSSProperties, MouseEvent, ReactNode } from "react"
import Menu from "@mui/material/Menu"

type MenuShellProps = {
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
  /** Classes for the wrapping <div> around the trigger + menu */
  wrapperClassName?: string
  /** Which edge of the button the menu aligns to. Defaults to "right". */
  anchorHorizontal?: "left" | "right"
  /** Extra class for the MUI Paper (controls width, etc.). */
  menuWidthClassName?: string
  /** Padding utility for the MUI Paper. Defaults to "p-1.5". */
  menuPaperPaddingClassName?: string
  /** Border-radius utility for the MUI Paper. Defaults to "rounded-lg". */
  menuPaperRadiusClassName?: string
  /** The menu body (items, sections, etc.). */
  children: ReactNode
}

/**
 * Shared trigger-button + MUI Menu chrome used by the dashboard dropdowns.
 * Owns the accessibility wiring, anchor/transform origins, and Paper styling so
 * the popover look-and-feel lives in one place; callers supply the menu body.
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
      <button
        id={buttonId}
        type="button"
        aria-haspopup="menu"
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen ? "true" : undefined}
        aria-label={triggerAriaLabel}
        onClick={onToggle}
        className={triggerClassName}
        style={triggerStyle}
      >
        {triggerContent}
      </button>

      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={isOpen}
        onClose={onClose}
        anchorOrigin={{ vertical: "bottom", horizontal: anchorHorizontal }}
        transformOrigin={{ vertical: "top", horizontal: anchorHorizontal }}
        MenuListProps={{
          "aria-labelledby": buttonId,
          className: "home-filter-menu-list recent-diagrams-font !p-0",
        }}
        PaperProps={{
          className: `home-filter-menu-paper recent-diagrams-font mt-2 ${menuPaperRadiusClassName} border-0 bg-[var(--home-surface-raised)] ${menuPaperPaddingClassName} shadow-2xl transition-colors duration-200 ${menuWidthClassName}`,
          sx: {
            boxShadow: "0 16px 36px var(--home-shadow-overlay)",
            backgroundColor: "var(--home-surface-raised)",
            backgroundImage: "none",
            color: "var(--home-text-primary)",
          },
        }}
      >
        {children}
      </Menu>
    </div>
  )
}
