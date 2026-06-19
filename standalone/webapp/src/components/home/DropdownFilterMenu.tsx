import type { MouseEvent, ReactNode } from "react"
import MenuItem from "@mui/material/MenuItem"
import { MenuShell } from "./MenuShell"

type DropdownFilterMenuItem = {
  key: string
  label: string
  selected: boolean
  onSelect: () => void
  selectedLabel?: string
}

type DropdownFilterMenuSection = {
  title: string
  items: DropdownFilterMenuItem[]
}

type DropdownFilterMenuProps = {
  buttonId: string
  menuId: string
  anchorEl: HTMLButtonElement | null
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void
  onClose: () => void
  triggerClassName: string
  triggerContent: ReactNode
  sections: DropdownFilterMenuSection[]
  menuWidthClassName?: string
  anchorHorizontal?: "left" | "right"
}

export const DropdownFilterMenu = ({
  buttonId,
  menuId,
  anchorEl,
  onToggle,
  onClose,
  triggerClassName,
  triggerContent,
  sections,
  menuWidthClassName = "w-60 max-w-[min(92vw,15rem)]",
  anchorHorizontal = "right",
}: DropdownFilterMenuProps) => {
  return (
    <MenuShell
      buttonId={buttonId}
      menuId={menuId}
      anchorEl={anchorEl}
      onToggle={onToggle}
      onClose={onClose}
      triggerClassName={triggerClassName}
      triggerContent={
        <>
          {triggerContent}
          <svg
            className="h-3.5 w-3.5 shrink-0 text-[var(--home-text-secondary)]"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </>
      }
      wrapperClassName="relative min-w-0 flex-1 sm:flex-none"
      anchorHorizontal={anchorHorizontal}
      menuWidthClassName={menuWidthClassName}
      menuPaperPaddingClassName="p-2"
      menuPaperRadiusClassName="rounded-md"
    >
      {sections.map((section, sectionIndex) => (
        <div key={section.title}>
          {sectionIndex > 0 ? (
            <div className="my-2 h-px bg-[var(--home-border-default)]" />
          ) : null}
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--home-text-secondary)]">
            {section.title}
          </div>
          {section.items.map((item) => (
            <MenuItem
              key={item.key}
              selected={item.selected}
              onClick={item.onSelect}
              className={`home-filter-menu-item !min-h-0 !rounded-md !px-2 !py-1.5 !text-xs transition-colors duration-200 ${
                item.selected
                  ? "!bg-[var(--home-surface-raised-hover)] !text-[var(--home-text-primary)]"
                  : "!text-[var(--home-text-secondary)] hover:!bg-[color-mix(in_srgb,var(--home-surface-raised-hover)_50%,transparent)] hover:!text-[var(--home-text-primary)]"
              }`}
            >
              <span className="w-full">{item.label}</span>
              {item.selected ? (
                <span className="text-[var(--home-text-primary)] opacity-90 font-medium">
                  {item.selectedLabel ?? "Selected"}
                </span>
              ) : null}
            </MenuItem>
          ))}
        </div>
      ))}
    </MenuShell>
  )
}
