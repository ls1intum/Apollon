import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react"
import type { UMLDiagramType } from "@tumaet/apollon"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import { Link, useNavigate } from "@tanstack/react-router"
import { toast } from "react-toastify"
import { useModalContext } from "@/contexts"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useMinuteTick } from "@/hooks/useMinuteTick"
import { DiagramView } from "@/types"
import { getDiagramTypeIcon, getDiagramTypeShortLabel } from "./diagramTypeMeta"
import {
  markSharedDiagramCopied,
  removeSharedDiagramEntry,
  updateSharedDiagramView,
} from "@/utils/sharedDiagramStorage"
import {
  SHARED_DIAGRAM_VIEW_OPTIONS,
  sharedDiagramRoute,
  buildSharedDiagramUrl,
  getSharedDiagramViewBadge,
} from "@/utils/sharedDiagramLinks"
import { getCachedThumbnailSources } from "@/utils/thumbnailTheme"
import { runWhenIdle } from "@/utils/idle"

export type DiagramSource = "local" | "shared"

export type RecentDiagram = {
  id: string
  title: string
  type: UMLDiagramType
  lastModifiedAt: string
  favorite: boolean
  source?: DiagramSource
  createdAt?: string
  lastSharedView?: DiagramView
}

/**
 * Card layout is authored at a 260x300 base size and uniformly scaled up on
 * larger breakpoints via the `--card-scale` CSS variable (see the root card
 * element). All inner spacing is expressed in these base-px steps and run
 * through `scalePx()` so the proportions hold at every scale.
 */
const CARD_BASE_HEIGHT_PX = 300
const CARD_HEADER_HEIGHT_PX = 243
const CARD_FOOTER_HEIGHT_PX = 56
const CARD_ICON_AREA_HEIGHT_PX = 138
const CARD_PAD_X_PX = 16
const CARD_HEADER_PAD_TOP_PX = 54
const CARD_HEADER_PAD_BOTTOM_PX = 10
const CARD_FOOTER_PAD_TOP_PX = 10
const CARD_FOOTER_PAD_BOTTOM_PX = 14
const CARD_ICON_GAP_PX = 8
const CARD_ICON_BUTTON_PX = 30
const CARD_BADGE_MAX_WIDTH_PX = 112

/**
 * Card typography scale (in px). Kept small and named so every label on the
 * card maps to one of these steps instead of an inline literal.
 */
const CARD_TYPE_TITLE_PX = 13
const CARD_TYPE_META_PX = 11
const CARD_TYPE_BADGE_PX = 10.5

const formatRelativeLastModified = (lastModifiedAt: string, nowMs: number) => {
  const parsedDate = new Date(lastModifiedAt)
  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown date"
  }

  const diffMilliseconds = nowMs - parsedDate.getTime()
  const minuteMs = 60 * 1000
  const hourMs = 60 * minuteMs
  const dayMs = 24 * hourMs

  if (diffMilliseconds < minuteMs) {
    return "just now"
  }

  if (diffMilliseconds < hourMs) {
    const minutes = Math.floor(diffMilliseconds / minuteMs)
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  }

  if (diffMilliseconds < dayMs) {
    const hours = Math.floor(diffMilliseconds / hourMs)
    return `${hours} hour${hours === 1 ? "" : "s"} ago`
  }

  if (diffMilliseconds < 2 * dayMs) {
    return "Yesterday"
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const getDiagramNav = (diagram: RecentDiagram) => {
  const source = diagram.source ?? "local"
  if (source === "local") {
    return { to: "/local/$id", params: { id: diagram.id } } as const
  }

  return sharedDiagramRoute(
    diagram.id,
    diagram.lastSharedView ?? DiagramView.EDIT
  )
}

type DiagramActionsMenuProps = {
  diagram: RecentDiagram
  containerClassName?: string
  triggerClassName?: string
  triggerStyle?: CSSProperties
  menuClassName?: string
  menuStyle?: CSSProperties
  stopPropagation?: boolean
  isExpired?: boolean
  onSharedDiagramRemoved?: (diagramId: string) => void
  onSharedDiagramViewChange?: (diagramId: string, view: DiagramView) => void
}

export const DiagramActionsMenu = ({
  diagram,
  containerClassName = "relative",
  triggerClassName = "cursor-pointer rounded-md border border-[var(--home-border-default)] bg-[var(--home-surface-sunken)] p-1.5 text-[var(--home-text-primary)] shadow-sm transition-colors duration-200 hover:border-[var(--home-accent-ring)] hover:bg-[var(--home-accent-ring)] hover:text-[var(--home-text-on-badge)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2",
  triggerStyle,
  menuClassName = "z-40 w-52 rounded-lg border border-[var(--home-border-subtle)] bg-[var(--home-surface-raised)] p-1 shadow-2xl transition-colors duration-200",
  menuStyle,
  stopPropagation = false,
  isExpired = false,
  onSharedDiagramRemoved,
  onSharedDiagramViewChange,
}: DiagramActionsMenuProps) => {
  const navigate = useNavigate()
  const { openModal } = useModalContext()
  const deleteModel = usePersistenceModelStore((state) => state.deleteModel)
  const duplicateModel = usePersistenceModelStore(
    (state) => state.duplicateModel
  )
  const currentModelId = usePersistenceModelStore(
    (state) => state.currentModelId
  )

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLButtonElement | null>(
    null
  )
  const [sharingModeAnchorEl, setSharingModeAnchorEl] =
    useState<HTMLElement | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const isMenuOpen = Boolean(menuAnchorEl)
  const isSharingModeMenuOpen = Boolean(sharingModeAnchorEl)

  const diagramSource = diagram.source ?? "local"
  const isLocalDiagram = diagramSource === "local"
  const sharedView = diagram.lastSharedView ?? DiagramView.EDIT
  const isCurrentDiagramInEditor = diagram.id === currentModelId
  const menuItemClassName =
    "home-filter-menu-item !min-h-0 !rounded-md !px-3 !py-2 !text-sm !text-[var(--home-text-secondary)] transition-colors duration-200 hover:!bg-[var(--home-surface-raised-hover)] hover:!text-[var(--home-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2"

  const openSharingModeMenu = (anchorEl: HTMLElement) => {
    setSharingModeAnchorEl(anchorEl)
  }

  const closeSharingModeMenu = () => {
    setSharingModeAnchorEl(null)
  }

  const closeMenu = () => {
    closeSharingModeMenu()
    setMenuAnchorEl(null)
    setIsDeleteConfirmOpen(false)
  }

  const handleOpen = () => {
    navigate(getDiagramNav(diagram))
    closeMenu()
  }

  const handleDuplicate = () => {
    if (!isLocalDiagram) {
      return
    }

    duplicateModel(diagram.id)
    closeMenu()
  }

  const handleDelete = () => {
    if (!isLocalDiagram || isCurrentDiagramInEditor) {
      return
    }

    deleteModel(diagram.id)
    closeMenu()
  }

  const handleShare = () => {
    if (!isLocalDiagram) {
      return
    }

    openModal("SHARE_DASHBOARD", { modelId: diagram.id, contentOverflow: true })
    closeMenu()
  }

  const handleCopySharedLink = async () => {
    await copySharedLink(sharedView, "Link copied.")
  }

  const copySharedLink = async (view: DiagramView, message: string) => {
    try {
      await navigator.clipboard.writeText(
        buildSharedDiagramUrl(diagram.id, view)
      )
      markSharedDiagramCopied(diagram.id, view)
      toast.success(message)
      closeMenu()
    } catch {
      toast.error("Could not copy the shared link.")
    }
  }

  const handleChangeSharedView = (view: DiagramView) => {
    updateSharedDiagramView(diagram.id, view)
    onSharedDiagramViewChange?.(diagram.id, view)
    toast.success(`${getSharedDiagramViewBadge(view)} is now the default link.`)
    closeMenu()
  }

  const handleRemoveSharedEntry = () => {
    removeSharedDiagramEntry(diagram.id)
    onSharedDiagramRemoved?.(diagram.id)
    closeMenu()
  }

  const handleContainerClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (stopPropagation) {
      event.stopPropagation()
    }
  }

  const handleContainerMouseDown = (event: ReactMouseEvent<HTMLElement>) => {
    if (stopPropagation) {
      event.stopPropagation()
    }
  }

  const handleContainerKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (stopPropagation) {
      event.stopPropagation()
    }
  }

  return (
    <div
      className={containerClassName}
      onClick={handleContainerClick}
      onMouseDown={handleContainerMouseDown}
      onKeyDown={handleContainerKeyDown}
    >
      <button
        type="button"
        aria-label="Open diagram actions"
        className={`${triggerClassName} home-card-icon-button`}
        style={triggerStyle}
        data-active={isMenuOpen ? "true" : "false"}
        onClick={(event) => {
          if (stopPropagation) {
            event.stopPropagation()
          }
          setMenuAnchorEl((prevAnchorEl) => {
            if (prevAnchorEl) {
              setIsDeleteConfirmOpen(false)
              closeSharingModeMenu()
              return null
            }
            return event.currentTarget
          })
        }}
      >
        <svg
          className="h-[18px] w-[18px]"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="5" r="1.7" fill="currentColor" />
          <circle cx="12" cy="12" r="1.7" fill="currentColor" />
          <circle cx="12" cy="19" r="1.7" fill="currentColor" />
        </svg>
      </button>

      <Menu
        id={`diagram-actions-menu-${diagram.id}`}
        anchorEl={menuAnchorEl}
        open={isMenuOpen}
        onClose={closeMenu}
        elevation={0}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          className: `home-filter-menu-paper recent-diagrams-font ${menuClassName}`,
          style: menuStyle,
          sx: { mt: 1 },
        }}
        MenuListProps={{
          "aria-label": "Diagram actions",
          disablePadding: true,
          className: "home-filter-menu-list recent-diagrams-font p-1",
          onClick: stopPropagation
            ? (event) => event.stopPropagation()
            : undefined,
        }}
      >
        {isExpired ? (
          <div className="space-y-1">
            <MenuItem
              disableGutters
              sx={{ minHeight: 0 }}
              className="home-filter-menu-item home-filter-menu-item-delete !min-h-0 !rounded-md !px-3 !py-2 !text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2"
              onMouseEnter={closeSharingModeMenu}
              onClick={handleRemoveSharedEntry}
            >
              Remove from shared list
            </MenuItem>
          </div>
        ) : !isDeleteConfirmOpen ? (
          <div className="space-y-1">
            <MenuItem
              disableGutters
              sx={{ minHeight: 0 }}
              className={menuItemClassName}
              onClick={handleOpen}
            >
              {isLocalDiagram ? "Open" : "Open diagram"}
            </MenuItem>
            {isLocalDiagram ? (
              <>
                <MenuItem
                  disableGutters
                  sx={{ minHeight: 0 }}
                  className={menuItemClassName}
                  onClick={handleDuplicate}
                >
                  Duplicate
                </MenuItem>
                <MenuItem
                  disableGutters
                  sx={{ minHeight: 0 }}
                  className={menuItemClassName}
                  onClick={handleShare}
                >
                  Share
                </MenuItem>
                <div
                  className="w-full"
                  title={
                    isCurrentDiagramInEditor
                      ? "Cannot delete diagram currently being edited"
                      : undefined
                  }
                >
                  <MenuItem
                    disableGutters
                    sx={{ minHeight: 0 }}
                    aria-disabled={isCurrentDiagramInEditor}
                    disabled={isCurrentDiagramInEditor}
                    className={`home-filter-menu-item !min-h-0 !rounded-md !px-3 !py-2 !text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2 ${
                      isCurrentDiagramInEditor
                        ? "cursor-not-allowed bg-[var(--home-surface-sunken)] text-[var(--home-text-secondary)] opacity-60"
                        : "home-filter-menu-item-delete !text-[var(--apollon-alert-danger-color)] hover:!bg-[var(--apollon-alert-danger-background)]"
                    }`}
                    onClick={() => setIsDeleteConfirmOpen(true)}
                  >
                    Delete
                  </MenuItem>
                </div>
              </>
            ) : (
              <>
                <MenuItem
                  disableGutters
                  sx={{ minHeight: 0 }}
                  className={menuItemClassName}
                  onMouseEnter={closeSharingModeMenu}
                  onClick={() => void handleCopySharedLink()}
                >
                  Copy link
                </MenuItem>
                <MenuItem
                  disableGutters
                  className={menuItemClassName}
                  onClick={(event) => openSharingModeMenu(event.currentTarget)}
                  onMouseEnter={(event) =>
                    openSharingModeMenu(event.currentTarget)
                  }
                  onFocus={(event) => openSharingModeMenu(event.currentTarget)}
                  aria-haspopup="menu"
                  aria-controls={
                    isSharingModeMenuOpen
                      ? `diagram-sharing-mode-menu-${diagram.id}`
                      : undefined
                  }
                  aria-expanded={isSharingModeMenuOpen ? "true" : undefined}
                  sx={{
                    minHeight: 0,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  Change sharing mode
                  <svg
                    className="ml-2 h-4 w-4 shrink-0"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M7 4l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </MenuItem>
                <MenuItem
                  disableGutters
                  sx={{ minHeight: 0 }}
                  className="home-filter-menu-item home-filter-menu-item-delete !min-h-0 !rounded-md !px-3 !py-2 !text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2"
                  onMouseEnter={closeSharingModeMenu}
                  onClick={handleRemoveSharedEntry}
                >
                  Remove from shared list
                </MenuItem>
              </>
            )}
          </div>
        ) : (
          <div className="min-w-[220px] space-y-2 rounded-md border border-[var(--apollon-alert-danger-border)] bg-[var(--apollon-alert-danger-background)] p-3 text-sm transition-colors duration-200">
            <p className="font-medium text-[var(--apollon-alert-danger-color)]">
              Are you sure? This can&apos;t be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="cursor-pointer rounded-md border border-[var(--home-border-default)] bg-[var(--home-surface-base)] px-2 py-1 text-xs text-[var(--home-text-secondary)] transition-colors duration-200 hover:bg-[var(--home-surface-raised-hover)] hover:text-[var(--home-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-md border border-[var(--apollon-alert-danger-border)] bg-[var(--apollon-alert-danger-color)] px-2 py-1 text-xs text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Menu>
      <Menu
        id={`diagram-sharing-mode-menu-${diagram.id}`}
        anchorEl={sharingModeAnchorEl}
        open={isSharingModeMenuOpen}
        onClose={closeSharingModeMenu}
        elevation={0}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          className: `home-filter-menu-paper recent-diagrams-font ${menuClassName}`,
          style: menuStyle,
        }}
        MenuListProps={{
          "aria-label": "Change sharing mode",
          disablePadding: true,
          className: "home-filter-menu-list recent-diagrams-font p-1",
          onMouseLeave: closeSharingModeMenu,
          onClick: stopPropagation
            ? (event) => event.stopPropagation()
            : undefined,
        }}
      >
        {SHARED_DIAGRAM_VIEW_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            disableGutters
            selected={option.value === sharedView}
            className={`home-filter-menu-item !min-h-0 !rounded-md !px-2 !py-1.5 !text-xs transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2 ${
              option.value === sharedView
                ? "!bg-[var(--home-surface-raised-hover)] !text-[var(--home-text-primary)]"
                : "!text-[var(--home-text-secondary)] hover:!bg-[color-mix(in_srgb,var(--home-surface-raised-hover)_50%,transparent)] hover:!text-[var(--home-text-primary)]"
            }`}
            onClick={() => handleChangeSharedView(option.value)}
          >
            <span className="w-full">{option.badge}</span>
            {option.value === sharedView ? (
              <span className="font-medium text-[var(--home-text-primary)] opacity-90">
                Selected
              </span>
            ) : null}
          </MenuItem>
        ))}
      </Menu>
    </div>
  )
}

/** Renders a file-document shaped placeholder with the diagram-type icon inside. */
const FileDocumentIcon = ({ type }: { type: UMLDiagramType }) => {
  return (
    <div className="relative flex items-center justify-center">
      {/* File-page SVG shape - scaled to 84x102 */}
      <svg
        width="84"
        height="102"
        viewBox="0 0 72 88"
        fill="none"
        aria-hidden="true"
      >
        {/* Page body */}
        <path
          d="M4 6C4 2.686 6.686 0 10 0H48L68 20V82C68 85.314 65.314 88 62 88H10C6.686 88 4 85.314 4 82V6Z"
          fill="var(--home-badge-bg)"
        />
        {/* Folded corner */}
        <path
          d="M48 0L68 20H54C50.686 20 48 17.314 48 14V0Z"
          fill="var(--home-badge-fold)"
        />
      </svg>
      {/* Diagram type icon overlaid in the center of the document - scaled to w-8 h-8 */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -35%)",
          color: "var(--home-text-on-badge)",
        }}
      >
        {getDiagramTypeIcon(type, "w-8 h-8")}
      </div>
    </div>
  )
}

type DiagramCardProps = {
  diagram: RecentDiagram
  isThumbnailLoading?: boolean
  showPlaceholderIcon?: boolean
  showSourceBadge?: boolean
  isHighlighted?: boolean
  isExpired?: boolean
  onToggleFavorite?: (diagram: RecentDiagram) => void
  onSharedDiagramRemoved?: (diagramId: string) => void
  onSharedDiagramViewChange?: (diagramId: string, view: DiagramView) => void
}

const DiagramCardComponent = ({
  diagram,
  isThumbnailLoading = false,
  showPlaceholderIcon = false,
  showSourceBadge = false,
  isHighlighted = false,
  isExpired = false,
  onToggleFavorite,
  onSharedDiagramRemoved,
  onSharedDiagramViewChange,
}: DiagramCardProps) => {
  const toggleFavorite = usePersistenceModelStore(
    (state) => state.toggleFavorite
  )
  const thumbnailSvg = usePersistenceModelStore(
    (state) => state.thumbnails[diagram.id] ?? null
  )
  const thumbnailRevision = usePersistenceModelStore(
    (state) => state.thumbnailRevisions[diagram.id] ?? 0
  )

  // Untitled diagrams keep an empty real title and show a muted placeholder.
  const isUntitled = !diagram.title.trim()
  const title = diagram.title.trim() || "Untitled diagram"
  const diagramSource = diagram.source ?? "local"
  const isLocalDiagram = diagramSource === "local"
  const canToggleFavorite =
    !isExpired && (isLocalDiagram || Boolean(onToggleFavorite))
  const thumbnailCacheKey = `${diagram.id}:${thumbnailRevision}`
  const lightDataUrl = useMemo(
    () =>
      getCachedThumbnailSources(thumbnailCacheKey, thumbnailSvg)
        ?.lightDataUrl ?? null,
    [thumbnailCacheKey, thumbnailSvg]
  )
  const [darkDataUrl, setDarkDataUrl] = useState<string | null>(null)

  const shouldRenderDiagramThumbnail =
    !showPlaceholderIcon && Boolean(lightDataUrl)
  // Non-empty diagram with no thumbnail yet — treat as loading to avoid
  // flashing the fallback type icon during the pre-warmup delay.
  const isEffectivelyLoading =
    isThumbnailLoading || (!showPlaceholderIcon && !lightDataUrl)
  // Re-render once a minute (via a shared interval) so the relative date stays fresh.
  useMinuteTick()
  const relativeDate = formatRelativeLastModified(
    diagram.lastModifiedAt,
    // Display-only relative timestamp, refreshed each minute by useMinuteTick().
    // eslint-disable-next-line react-hooks/purity
    Date.now()
  )
  const shortTypeLabel = getDiagramTypeShortLabel(diagram.type)
  const sourceTypeLabel = isLocalDiagram ? "Local" : "Shared"
  const sharedViewLabel = getSharedDiagramViewBadge(diagram.lastSharedView)
  const scalePx = (value: number) => `calc(var(--card-scale) * ${value}px)`

  useEffect(() => {
    if (!thumbnailSvg) {
      setDarkDataUrl(null)
      return
    }
    return runWhenIdle(() => {
      const sources = getCachedThumbnailSources(
        thumbnailCacheKey,
        thumbnailSvg,
        {
          eager: true,
        }
      )
      if (sources) {
        setDarkDataUrl(sources.darkDataUrl)
      }
    })
  }, [thumbnailCacheKey, thumbnailSvg])

  const handleFavoriteToggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (onToggleFavorite) {
      onToggleFavorite(diagram)
      return
    }

    if (isLocalDiagram) {
      toggleFavorite(diagram.id)
    }
  }

  return (
    <div
      role="listitem"
      className={`home-diagram-card group relative mx-auto flex flex-col overflow-hidden bg-[var(--home-surface-raised)] transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] [--card-scale:1] hover:bg-[var(--home-surface-raised-hover)] md:[--card-scale:1.0769231] xl:[--card-scale:1.1538462] ${
        isHighlighted
          ? "bg-[var(--home-surface-raised-hover)]"
          : "hover:[box-shadow:0_6px_16px_var(--home-shadow-card-hover)]"
      }`}
      style={{
        border: "1px solid var(--home-border-subtle)",
        borderRadius: "var(--home-radius-sm)",
        width: "100%",
        maxWidth: "300px",
        height: scalePx(CARD_BASE_HEIGHT_PX),
        boxShadow: isHighlighted
          ? "0 0 0 4px var(--home-glow-neutral), 0 8px 32px var(--home-glow-neutral)"
          : undefined,
        animation: isHighlighted
          ? "diagram-highlight-pulse 2.4s ease-out forwards"
          : undefined,
      }}
    >
      {/* Expired overlay */}
      {isExpired && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 rounded-[var(--home-radius-sm)]"
          style={{
            background:
              "color-mix(in srgb, var(--home-surface-raised) 80%, transparent)",
          }}
        >
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--home-text-secondary)" }}
          >
            Link expired
          </span>
          <span
            className="text-[10px]"
            style={{ color: "var(--home-text-muted)" }}
          >
            This shared diagram is no longer available
          </span>
        </div>
      )}

      {/* Clickable card body. A real link so cmd/ctrl/middle-click opens the
          diagram in a new tab; plain click still navigates within the SPA. */}
      <Link
        {...getDiagramNav(diagram)}
        onClick={(event) => {
          if (isExpired) event.preventDefault()
        }}
        aria-label={isExpired ? `${title} (expired)` : `Open ${title}`}
        aria-disabled={isExpired}
        className={`flex h-full w-full flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-2 ${isExpired ? "cursor-default opacity-40" : "cursor-pointer"}`}
        style={{ outlineColor: "var(--home-accent-ring)" }}
      >
        {/* ---- Header Part: preview + title aligned horizontally ---- */}
        <div
          className="flex w-full flex-col"
          style={{
            height: scalePx(CARD_HEADER_HEIGHT_PX),
            background: "transparent",
            padding: `${scalePx(CARD_HEADER_PAD_TOP_PX)} ${scalePx(CARD_PAD_X_PX)} ${scalePx(CARD_HEADER_PAD_BOTTOM_PX)} ${scalePx(CARD_PAD_X_PX)}`,
          }}
        >
          {/* ---- Icon preview area (Transparent) ---- */}
          <div
            className="flex w-full items-center justify-center"
            style={{
              background: "transparent",
              height: scalePx(CARD_ICON_AREA_HEIGHT_PX),
              marginBottom: scalePx(CARD_ICON_GAP_PX),
            }}
          >
            {shouldRenderDiagramThumbnail ? (
              <div className="relative h-full w-full">
                <img
                  src={lightDataUrl!}
                  alt={`${title} diagram preview`}
                  className="theme-thumbnail-image theme-thumbnail-light"
                  loading="lazy"
                />
                {darkDataUrl && (
                  <img
                    src={darkDataUrl}
                    alt=""
                    aria-hidden="true"
                    className="theme-thumbnail-image theme-thumbnail-dark"
                    loading="lazy"
                  />
                )}
              </div>
            ) : isEffectivelyLoading && !showPlaceholderIcon ? (
              <div className="flex flex-col items-center gap-2">
                <span
                  className="h-5 w-5 animate-spin rounded-full border-2"
                  style={{
                    borderColor: "var(--home-border-default)",
                    borderTopColor: "var(--home-accent-base)",
                  }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--home-text-secondary)" }}
                >
                  Loading...
                </span>
              </div>
            ) : showPlaceholderIcon ? (
              <FileDocumentIcon type={diagram.type} />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ color: "var(--home-text-on-badge)" }}
              >
                {getDiagramTypeIcon(diagram.type, "w-12 h-12")}
              </div>
            )}
          </div>

          {/* ---- Title section (smaller, bottom-left in header) ---- */}
          <div className="mt-auto w-full text-left">
            <p
              className="truncate"
              title={title}
              style={{
                color: isUntitled
                  ? "var(--home-text-muted)"
                  : "var(--home-text-strong)",
                fontStyle: isUntitled ? "italic" : "normal",
                fontSize: `${CARD_TYPE_TITLE_PX}px`,
                fontWeight: 500,
                lineHeight: "1.3",
              }}
            >
              {title}
            </p>
          </div>
        </div>

        {/* ---- Divider line ---- */}
        <div
          style={{
            borderTop: "0.5px solid var(--home-border-subtle)",
            margin: `0 ${scalePx(CARD_PAD_X_PX)}`,
          }}
        />

        {/* ---- Bottom metadata + tags row ---- */}
        <div
          className="flex items-center justify-between w-full"
          style={{
            padding: `${scalePx(CARD_FOOTER_PAD_TOP_PX)} ${scalePx(CARD_PAD_X_PX)} ${scalePx(CARD_FOOTER_PAD_BOTTOM_PX)} ${scalePx(CARD_PAD_X_PX)}`,
            height: scalePx(CARD_FOOTER_HEIGHT_PX),
          }}
        >
          {/* Relative last-modified date; full timestamp on hover */}
          <div
            className="flex flex-col text-left"
            title={new Date(diagram.lastModifiedAt).toLocaleString()}
          >
            <span
              style={{
                color: "var(--home-text-muted)",
                fontSize: `${CARD_TYPE_META_PX}px`,
                lineHeight: "1.2",
              }}
            >
              Modified:
            </span>
            <span
              className="truncate font-medium"
              style={{
                color: "var(--home-text-muted)",
                fontSize: `${CARD_TYPE_META_PX}px`,
                lineHeight: "1.2",
              }}
            >
              {relativeDate}
            </span>
          </div>

          {/*
            Tag group — always shows the diagram-type pill (primary).
            A secondary source/mode pill is added when relevant:
            - "all diagrams" view: Local or Shared
            - shared diagrams: the sharing mode (view/edit)
          */}
          <div className="flex shrink-0 items-center gap-1 pl-2">
            <span
              className="rounded"
              title={shortTypeLabel}
              style={{
                padding: "3px 8px",
                fontSize: `${CARD_TYPE_BADGE_PX}px`,
                lineHeight: 1.2,
                background: "var(--home-tag-type-bg)",
                color: "var(--home-tag-type-text)",
                fontWeight: 500,
                maxWidth: scalePx(CARD_BADGE_MAX_WIDTH_PX),
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {shortTypeLabel}
            </span>
            {showSourceBadge ? (
              <span
                className="rounded"
                title={sourceTypeLabel}
                style={{
                  padding: "3px 8px",
                  fontSize: `${CARD_TYPE_BADGE_PX}px`,
                  lineHeight: 1.2,
                  background: isLocalDiagram
                    ? "var(--home-tag-local-bg)"
                    : "var(--home-tag-shared-bg)",
                  color: isLocalDiagram
                    ? "var(--home-tag-local-text)"
                    : "var(--home-tag-shared-text)",
                  fontWeight: 600,
                  maxWidth: scalePx(CARD_BADGE_MAX_WIDTH_PX),
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {sourceTypeLabel}
              </span>
            ) : !isLocalDiagram ? (
              <span
                className="rounded"
                title={sharedViewLabel}
                style={{
                  padding: "3px 8px",
                  fontSize: `${CARD_TYPE_BADGE_PX}px`,
                  lineHeight: 1.2,
                  background: "var(--home-tag-shared-bg)",
                  color: "var(--home-tag-shared-text)",
                  fontWeight: 600,
                  maxWidth: scalePx(CARD_BADGE_MAX_WIDTH_PX),
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {sharedViewLabel}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      {/* ---- Star / Favorite button – overlaid top-left ---- */}
      {canToggleFavorite && (
        <button
          type="button"
          aria-label={
            diagram.favorite ? "Remove from favorites" : "Add to favorites"
          }
          className="home-card-icon-button absolute z-30 flex cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            left: scalePx(CARD_PAD_X_PX),
            top: scalePx(CARD_PAD_X_PX),
            width: scalePx(CARD_ICON_BUTTON_PX),
            height: scalePx(CARD_ICON_BUTTON_PX),
            outlineColor: "var(--home-accent-ring)",
            color: diagram.favorite
              ? "var(--home-favorite-star)"
              : "var(--home-text-muted)",
            ["--icon-hover-color" as string]: "var(--home-text-strong)",
            ["--icon-active-color" as string]: "var(--home-favorite-star)",
            ["--icon-hover-bg" as string]:
              "color-mix(in srgb, var(--home-text-primary) 10%, transparent)",
          }}
          data-active={diagram.favorite ? "true" : "false"}
          onClick={handleFavoriteToggle}
        >
          <svg
            className="h-[18px] w-[18px]"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill={diagram.favorite ? "currentColor" : "none"}
          >
            <path
              d="M12 3.7l2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9L12 3.7z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* ---- Three-dot menu – overlaid top-right ---- */}
      <DiagramActionsMenu
        diagram={diagram}
        stopPropagation
        isExpired={isExpired}
        containerClassName="absolute z-30 [right:calc(var(--card-scale)*16px)] [top:calc(var(--card-scale)*16px)]"
        triggerClassName="flex cursor-pointer items-center justify-center rounded-md p-1 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
        triggerStyle={{
          width: scalePx(CARD_ICON_BUTTON_PX),
          height: scalePx(CARD_ICON_BUTTON_PX),
          outlineColor: "var(--home-accent-ring)",
          color: "var(--home-text-muted)",
          ["--icon-hover-color" as string]: "var(--home-text-strong)",
          ["--icon-active-color" as string]: "var(--home-text-strong)",
          ["--icon-hover-bg" as string]:
            "color-mix(in srgb, var(--home-text-primary) 10%, transparent)",
        }}
        menuClassName="z-40 w-52 rounded-lg p-1 shadow-2xl"
        menuStyle={{
          background: "var(--home-surface-raised)",
          border: "none",
          boxShadow: "0 16px 36px var(--home-shadow-overlay)",
        }}
        onSharedDiagramRemoved={onSharedDiagramRemoved}
        onSharedDiagramViewChange={onSharedDiagramViewChange}
      />
    </div>
  )
}

export const DiagramCard = DiagramCardComponent
