import { useState } from "react"
import type { MouseEvent } from "react"
import { NAVBAR_BACKGROUND_COLOR } from "@/constants/colorPlate"
import { BrandAndVersion } from "./BrandAndVersion"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { NAVBAR_DROP_SHADOW } from "./styleConstants"
import { ActionMenu } from "@/components/home/ActionMenu"

const NewFileIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
  >
    <path
      d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20V4a.5.5 0 0 1 .5-.5z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M14 3.5V8h4" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M12 10.5v6M9 13.5h6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const TemplateIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
  >
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M3 9h18M9 21V9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ImportIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
  >
    <path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="17 8 12 3 7 8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
  </svg>
)

type HomeNavbarProps = {
  /** When true the quick-actions dropdown button is visible (banner scrolled away). */
  showQuickActions?: boolean
  onNewDiagram?: () => void
  onFromTemplate?: () => void
  onImportJson?: () => void
}

export const HomeNavbar = ({
  showQuickActions = false,
  onNewDiagram,
  onFromTemplate,
  onImportJson,
}: HomeNavbarProps) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl((current) => (current ? null : event.currentTarget))
  }

  const handleClose = () => {
    setMenuAnchorEl(null)
  }

  const isOpen = Boolean(menuAnchorEl)

  return (
    <header
      className="sticky top-0 z-40 flex min-h-[64px] items-center px-4 transition-colors duration-200"
      style={{
        backgroundColor: NAVBAR_BACKGROUND_COLOR,
        boxShadow: NAVBAR_DROP_SHADOW,
      }}
    >
      <div className="flex min-w-0 items-center overflow-hidden text-white">
        <BrandAndVersion />
      </div>

      <div className="flex-1" />

      {/* Quick-actions button — slides in when banner is out of view */}
      <div
        className={`mr-1 transition-all duration-200 ${
          showQuickActions
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        <ActionMenu
          buttonId="navbar-quick-actions-button"
          menuId="navbar-quick-actions-menu"
          anchorEl={menuAnchorEl}
          onToggle={handleToggle}
          onClose={handleClose}
          triggerAriaLabel="Create new diagram"
          triggerClassName={`home-on-accent-btn flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
            isOpen ? "bg-[var(--home-on-accent-bg-hover)]" : ""
          }`}
          triggerContent={
            <>
              <svg
                className="h-3.5 w-3.5 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                aria-hidden="true"
              >
                <path
                  d="M12 5v14M5 12h14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              New
              <svg
                className="h-3 w-3 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path
                  d="M6 9l6 6 6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          }
          anchorHorizontal="right"
          menuWidthClassName="min-w-[220px]"
          items={[
            {
              key: "new-diagram",
              label: "Create new diagram",
              icon: <NewFileIcon />,
              onSelect: () => onNewDiagram?.(),
            },
            {
              key: "from-template",
              label: "Start from template",
              icon: <TemplateIcon />,
              onSelect: () => onFromTemplate?.(),
            },
            {
              key: "import-json",
              label: "Import from JSON",
              icon: <ImportIcon />,
              onSelect: () => onImportJson?.(),
            },
          ]}
        />
      </div>

      <div className="px-2">
        <ThemeSwitcherMenu />
      </div>
    </header>
  )
}
