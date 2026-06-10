import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import type { ReactNode } from "react"

const SIDEBAR_WIDTH = 300
const COLLAPSED_WIDTH = 44

export const PlaygroundControlsSidebar = ({
  open,
  onToggle,
  children,
}: {
  open: boolean
  onToggle: () => void
  children: ReactNode
}) => (
  <aside
    data-testid="playground-controls-sidebar"
    style={{
      position: "relative",
      width: open ? SIDEBAR_WIDTH : COLLAPSED_WIDTH,
      flexShrink: 0,
      height: "100%",
      overflow: "hidden",
      borderRight: "1px solid var(--apollon-gray)",
      backgroundColor: "var(--apollon-background-variant)",
      color: "var(--apollon-primary-contrast)",
      transition: "width 200ms ease-in-out",
    }}
  >
    <button
      type="button"
      aria-label={
        open ? "Collapse playground controls" : "Expand playground controls"
      }
      aria-expanded={open}
      aria-controls="playground-controls-sidebar-content"
      onClick={onToggle}
      style={{
        position: "absolute",
        top: 8,
        right: 6,
        zIndex: 1,
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--apollon-gray)",
        borderRadius: 6,
        backgroundColor: "var(--apollon-background)",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      {open ? (
        <ChevronLeftIcon fontSize="small" />
      ) : (
        <ChevronRightIcon fontSize="small" />
      )}
    </button>

    {open && (
      <div
        id="playground-controls-sidebar-content"
        style={{
          width: SIDEBAR_WIDTH,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          overflowY: "auto",
          padding: "52px 16px 16px",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    )}
  </aside>
)
