import type { MouseEvent, ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { DropdownMenuItem } from "@tumaet/ui/components/dropdown-menu"
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
          <ChevronDown
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
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
          {sectionIndex > 0 ? <div className="my-2 h-px bg-border" /> : null}
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title}
          </div>
          {section.items.map((item) => (
            <DropdownMenuItem
              key={item.key}
              onClick={item.onSelect}
              className={`min-h-0 rounded-md px-2 py-1.5 text-xs transition-colors duration-200 ${
                item.selected
                  ? "bg-accent-hover text-foreground data-[highlighted]:bg-accent-hover"
                  : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--home-surface-raised-hover)_50%,transparent)] hover:text-foreground data-[highlighted]:bg-[color-mix(in_srgb,var(--home-surface-raised-hover)_50%,transparent)] data-[highlighted]:text-foreground"
              }`}
            >
              <span className="w-full">{item.label}</span>
              {item.selected ? (
                <span className="text-foreground opacity-90 font-medium">
                  {item.selectedLabel ?? "Selected"}
                </span>
              ) : null}
            </DropdownMenuItem>
          ))}
        </div>
      ))}
    </MenuShell>
  )
}
