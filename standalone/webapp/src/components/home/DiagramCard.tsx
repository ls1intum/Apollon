import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react"
import type { UMLDiagramType } from "@tumaet/apollon"
import { useNavigate } from "react-router"
import { useModalContext } from "@/contexts"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { DiagramView } from "@/types"
import { getDiagramTypeIcon, getDiagramTypeLabel } from "./DiagramTypeGrid"

export type DiagramSource = "local" | "shared"

export type RecentDiagram = {
  id: string
  title: string
  type: UMLDiagramType
  lastModifiedAt: string
  favorite: boolean
  source?: DiagramSource
}

const toSvgDataUrl = (svgString: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`

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

const getDiagramPath = (diagram: RecentDiagram) => {
  const source = diagram.source ?? "local"
  if (source === "local") {
    return `/local/${diagram.id}`
  }

  return `/shared/${diagram.id}?view=${DiagramView.EDIT}`
}

type DiagramActionsMenuProps = {
  diagram: RecentDiagram
  containerClassName?: string
  triggerClassName?: string
  menuClassName?: string
  stopPropagation?: boolean
}

export const DiagramActionsMenu = ({
  diagram,
  containerClassName = "relative",
  triggerClassName =
    "cursor-pointer rounded-md border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] p-1.5 text-[var(--home-text-primary)] shadow-sm transition-colors duration-200 hover:border-[var(--home-accent-color)] hover:bg-[var(--home-accent-color)] hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2",
  menuClassName =
    "absolute right-0 z-40 mt-2 w-52 rounded-lg border border-[var(--home-border-color)] bg-[var(--home-bg-card)] p-1 shadow-lg transition-colors duration-200",
  stopPropagation = false,
}: DiagramActionsMenuProps) => {
  const navigate = useNavigate()
  const { openModal } = useModalContext()
  const deleteModel = usePersistenceModelStore((state) => state.deleteModel)
  const duplicateModel = usePersistenceModelStore((state) => state.duplicateModel)
  const currentModelId = usePersistenceModelStore((state) => state.currentModelId)

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const menuContainerRef = useRef<HTMLDivElement>(null)

  const diagramSource = diagram.source ?? "local"
  const isLocalDiagram = diagramSource === "local"
  const isCurrentDiagramInEditor = diagram.id === currentModelId

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuContainerRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false)
        setIsDeleteConfirmOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [isMenuOpen])

  const closeMenu = () => {
    setIsMenuOpen(false)
    setIsDeleteConfirmOpen(false)
  }

  const handleOpen = () => {
    navigate(getDiagramPath(diagram))
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

    openModal("SHARE", { modelId: diagram.id })
    closeMenu()
  }

  const handleCopySharedLink = async () => {
    const sharedUrl = `${window.location.origin}${getDiagramPath(diagram)}`
    await navigator.clipboard.writeText(sharedUrl)
    closeMenu()
  }

  const handleContainerClick = (event: ReactMouseEvent<HTMLElement>) => {
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
      ref={menuContainerRef}
      className={containerClassName}
      onClick={handleContainerClick}
      onKeyDown={handleContainerKeyDown}
    >
      <button
        type="button"
        aria-label="Open diagram actions"
        className={triggerClassName}
        onClick={() => {
          setIsMenuOpen((prevState) => {
            if (prevState) {
              setIsDeleteConfirmOpen(false)
            }
            return !prevState
          })
        }}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" fill="currentColor" />
          <circle cx="12" cy="12" r="1.7" fill="currentColor" />
          <circle cx="12" cy="19" r="1.7" fill="currentColor" />
        </svg>
      </button>

      {isMenuOpen && (
        <div className={menuClassName}>
          {!isDeleteConfirmOpen ? (
            <div className="space-y-1">
              <button
                type="button"
                className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-[var(--home-text-secondary)] transition-colors duration-200 hover:bg-[var(--home-bg-secondary)] hover:text-[var(--home-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                onClick={handleOpen}
              >
                Open
              </button>
              {isLocalDiagram ? (
                <>
                  <button
                    type="button"
                    className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-[var(--home-text-secondary)] transition-colors duration-200 hover:bg-[var(--home-bg-secondary)] hover:text-[var(--home-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                    onClick={handleDuplicate}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-[var(--home-text-secondary)] transition-colors duration-200 hover:bg-[var(--home-bg-secondary)] hover:text-[var(--home-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                    onClick={handleShare}
                  >
                    Share
                  </button>
                  <div
                    className="w-full"
                    title={
                      isCurrentDiagramInEditor
                        ? "Cannot delete diagram currently being edited"
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      aria-disabled={isCurrentDiagramInEditor}
                      disabled={isCurrentDiagramInEditor}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2 ${
                        isCurrentDiagramInEditor
                          ? "cursor-not-allowed bg-[var(--home-bg-secondary)] text-[var(--home-text-secondary)] opacity-60"
                          : "cursor-pointer text-[var(--apollon-alert-danger-color)] hover:bg-[var(--apollon-alert-danger-background)]"
                      }`}
                      onClick={() => setIsDeleteConfirmOpen(true)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-[var(--home-text-secondary)] transition-colors duration-200 hover:bg-[var(--home-bg-secondary)] hover:text-[var(--home-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                  onClick={() => void handleCopySharedLink()}
                >
                  Copy Link
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 rounded-md border border-[var(--apollon-alert-danger-border)] bg-[var(--apollon-alert-danger-background)] p-2 text-sm transition-colors duration-200">
              <p className="font-medium text-[var(--apollon-alert-danger-color)]">
                Delete this diagram?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="cursor-pointer rounded-md border border-[var(--home-border-color)] bg-[var(--home-bg-primary)] px-2 py-1 text-xs text-[var(--home-text-secondary)] transition-colors duration-200 hover:bg-[var(--home-bg-secondary)] hover:text-[var(--home-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-md border border-[var(--apollon-alert-danger-border)] bg-[var(--apollon-alert-danger-color)] px-2 py-1 text-xs text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type DiagramCardProps = {
  diagram: RecentDiagram
  isThumbnailLoading?: boolean
  showPlaceholderIcon?: boolean
  onToggleFavorite?: (diagram: RecentDiagram) => void
}

const DiagramCardComponent = ({
  diagram,
  isThumbnailLoading = false,
  showPlaceholderIcon = false,
  onToggleFavorite,
}: DiagramCardProps) => {
  const navigate = useNavigate()
  const toggleFavorite = usePersistenceModelStore((state) => state.toggleFavorite)
  const thumbnailSvg = usePersistenceModelStore(
    (state) => state.thumbnails[diagram.id] ?? null
  )

  const typeLabel = getDiagramTypeLabel(diagram.type)
  const title = diagram.title.trim() || "Untitled Diagram"
  const diagramSource = diagram.source ?? "local"
  const isLocalDiagram = diagramSource === "local"
  const canToggleFavorite = isLocalDiagram || Boolean(onToggleFavorite)
  const [relativeDate, setRelativeDate] = useState(() =>
    formatRelativeLastModified(diagram.lastModifiedAt, Date.now())
  )
  const editedRelativeDate =
    relativeDate === "Unknown date" ? relativeDate : `Edited ${relativeDate}`
  const thumbnailDataUrl = useMemo(
    () => (thumbnailSvg ? toSvgDataUrl(thumbnailSvg) : null),
    [thumbnailSvg]
  )
  const shouldRenderThumbnail = !showPlaceholderIcon && Boolean(thumbnailDataUrl)

  useEffect(() => {
    const updateRelativeDate = () => {
      setRelativeDate(formatRelativeLastModified(diagram.lastModifiedAt, Date.now()))
    }

    updateRelativeDate()
    const intervalId = window.setInterval(updateRelativeDate, 60_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [diagram.lastModifiedAt])

  const handleOpen = () => {
    navigate(getDiagramPath(diagram))
  }

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
      className="home-diagram-card group relative mx-auto flex h-64 w-full flex-col overflow-hidden rounded-lg border border-[var(--home-border-color)] bg-[var(--home-bg-card)] shadow-sm transition-[background-color,border-color] duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--home-accent-color)] hover:bg-[var(--home-accent-soft)] hover:shadow-md"
    >
      {canToggleFavorite && (
        <button
          type="button"
          aria-label={diagram.favorite ? "Remove from favorites" : "Add to favorites"}
          className={`absolute left-2 top-2 z-30 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border shadow-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2 ${
            diagram.favorite
              ? "border-[var(--home-favorite-border)] bg-[var(--home-favorite-bg)] text-[var(--home-favorite-star)]"
              : "border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] text-[var(--home-text-secondary)] hover:border-[var(--home-accent-color)] hover:text-[var(--home-accent-color)]"
          }`}
          onClick={handleFavoriteToggle}
        >
          <svg
            className="h-4 w-4"
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

      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Open ${title}`}
        className="flex h-full w-full cursor-pointer flex-col text-left focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
      >
        <div className="relative h-[calc(100%-96px)] min-h-0 overflow-hidden border-b border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] transition-[height,background-color] duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:h-[calc(100%-56px)]">
          <div className="pointer-events-none absolute inset-0 z-0 bg-[var(--home-accent-color)]/0 transition-colors duration-300 ease-out group-hover:bg-[var(--home-accent-color)]/12" />
          {shouldRenderThumbnail ? (
            <img
              src={thumbnailDataUrl!}
              alt={`${title} thumbnail`}
              className="relative z-10 h-full w-full object-contain p-2"
              loading="lazy"
            />
          ) : (
            <div className="relative z-10 flex h-full w-full items-center justify-center bg-[var(--home-bg-secondary)] text-[var(--home-accent-color)] transition-colors duration-200 group-hover:bg-[var(--home-accent-soft)] group-hover:text-[var(--home-accent-color)]">
              {isThumbnailLoading ? (
                <div className="flex flex-col items-center gap-2 text-xs font-medium text-[var(--home-text-secondary)]">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--home-border-color)] border-t-[var(--home-accent-color)]" />
                  <span>Generating preview...</span>
                </div>
              ) : (
                getDiagramTypeIcon(diagram.type, "h-16 w-16")
              )}
            </div>
          )}

        </div>

        <div className="relative h-[96px] shrink-0 overflow-hidden transition-[height] duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:h-[56px]">
          <div className="absolute inset-0 bg-[var(--home-hover-overlay-bg)]/0 transition-colors duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-[var(--home-hover-overlay-bg)]/100" />
          <div className="relative z-10 h-full">
            <div className="home-diagram-card-meta-normal absolute inset-0 p-3 transition-[opacity,transform] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-[55%] group-hover:opacity-0">
              <p
                className="truncate text-sm font-semibold leading-5 text-[var(--home-text-primary)] transition-colors duration-200"
                title={title}
              >
                {title}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className="inline-flex max-w-[70%] truncate rounded-full border border-[var(--home-border-color)] bg-[var(--home-chip-bg)] px-2 py-1 text-xs font-medium text-[var(--home-chip-text)] transition-colors duration-200"
                  title={typeLabel}
                >
                  {typeLabel}
                </span>
                <span className="shrink-0 text-xs text-[var(--home-text-secondary)] transition-colors duration-200">
                  {editedRelativeDate}
                </span>
              </div>
            </div>

            <div className="home-diagram-card-meta-compact pointer-events-none absolute inset-0 flex translate-y-[35%] items-center justify-between px-3 py-2 opacity-0 transition-[opacity,transform] duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 group-hover:opacity-100">
              <p
                className="min-w-0 truncate text-sm font-semibold leading-5 text-[var(--home-hover-overlay-text)]"
                title={title}
              >
                {title}
              </p>
              <span className="ml-3 shrink-0 text-xs leading-5 text-[var(--home-hover-overlay-text)]">
                {editedRelativeDate}
              </span>
            </div>
          </div>
        </div>
      </button>

      <DiagramActionsMenu
        diagram={diagram}
        containerClassName="absolute right-2 top-2 z-30"
        triggerClassName="cursor-pointer rounded-md border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] p-1.5 text-[var(--home-text-primary)] opacity-75 shadow-sm transition-colors duration-200 hover:border-[var(--home-accent-color)] hover:bg-[var(--home-accent-color)] hover:text-white focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2 group-hover:opacity-100"
      />
    </div>
  )
}

export const DiagramCard = memo(DiagramCardComponent)
