import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"

const SIDEBAR_WIDTH = 320
const COLLAPSED_WIDTH = 44

export const CollaborationViewportSidebar = ({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) => (
  <aside
    data-testid="collaboration-viewport-sidebar"
    style={{
      position: "relative",
      width: open ? SIDEBAR_WIDTH : COLLAPSED_WIDTH,
      flexShrink: 0,
      height: "100%",
      overflow: "hidden",
      borderLeft: "1px solid var(--apollon-gray)",
      backgroundColor: "var(--apollon-background)",
      color: "var(--apollon-primary-contrast)",
      transition: "width 200ms ease-in-out",
    }}
  >
    <button
      type="button"
      aria-label={open ? "Collapse test sidebar" : "Expand test sidebar"}
      aria-expanded={open}
      aria-controls="collaboration-viewport-sidebar-content"
      onClick={onToggle}
      style={{
        position: "absolute",
        top: 8,
        left: 6,
        zIndex: 1,
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--apollon-gray)",
        borderRadius: 6,
        backgroundColor: "var(--apollon-background-variant)",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      {open ? (
        <ChevronRightIcon fontSize="small" />
      ) : (
        <ChevronLeftIcon fontSize="small" />
      )}
    </button>

    {open && (
      <div
        id="collaboration-viewport-sidebar-content"
        style={{
          width: SIDEBAR_WIDTH,
          height: "100%",
          padding: "14px 16px 16px 48px",
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          Problem statement
        </h2>
        <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.5 }}>
          This inline panel simulates host application chrome that reduces the
          available modeling width. Open this playground in two tabs, enable the
          collaboration viewport test in both, and collapse this panel in only
          one tab.
        </p>
      </div>
    )}
  </aside>
)
