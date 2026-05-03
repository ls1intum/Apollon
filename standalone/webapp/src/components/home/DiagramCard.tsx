import { memo, useEffect, useMemo, useRef, useState } from "react"
import type { UMLDiagramType } from "@tumaet/apollon"
import { useNavigate } from "react-router"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { getDiagramTypeIcon, getDiagramTypeLabel } from "./DiagramTypeGrid"

export type RecentDiagram = {
  id: string
  title: string
  type: UMLDiagramType
  lastModifiedAt: string
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

type DiagramCardProps = {
  diagram: RecentDiagram
  isMostRecent?: boolean
  isThumbnailLoading?: boolean
  showPlaceholderIcon?: boolean
}

const DiagramCardComponent = ({
  diagram,
  isMostRecent = false,
  isThumbnailLoading = false,
  showPlaceholderIcon = false,
}: DiagramCardProps) => {
  const navigate = useNavigate()
  const deleteModel = usePersistenceModelStore((state) => state.deleteModel)
  const duplicateModel = usePersistenceModelStore(
    (state) => state.duplicateModel
  )
  const thumbnailSvg = usePersistenceModelStore(
    (state) => state.thumbnails[diagram.id] ?? null
  )

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  // Two-step delete: isDeleteConfirmOpen swaps the menu for an inline confirm panel before committing.
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const menuContainerRef = useRef<HTMLDivElement>(null)

  const typeLabel = getDiagramTypeLabel(diagram.type)
  const title = diagram.title.trim() || "Untitled Diagram"
  const [relativeDate, setRelativeDate] = useState(() =>
    formatRelativeLastModified(diagram.lastModifiedAt, Date.now())
  )
  const thumbnailDataUrl = useMemo(
    () => (thumbnailSvg ? toSvgDataUrl(thumbnailSvg) : null),
    [thumbnailSvg]
  )
  const shouldRenderThumbnail =
    !showPlaceholderIcon && Boolean(thumbnailDataUrl)

  useEffect(() => {
    const updateRelativeDate = () => {
      setRelativeDate(
        formatRelativeLastModified(diagram.lastModifiedAt, Date.now())
      )
    }

    updateRelativeDate()
    const intervalId = window.setInterval(updateRelativeDate, 60_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [diagram.lastModifiedAt])

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

  const handleOpen = () => {
    navigate(`/local/${diagram.id}`)
  }

  const handleDuplicate = () => {
    duplicateModel(diagram.id)
    setIsMenuOpen(false)
    setIsDeleteConfirmOpen(false)
  }

  const handleDelete = () => {
    deleteModel(diagram.id)
    setIsMenuOpen(false)
    setIsDeleteConfirmOpen(false)
  }

  return (
    <div
      role="listitem"
      className="home-diagram-card group relative mx-auto flex h-64 w-full flex-col overflow-hidden rounded-lg border border-[var(--home-border-color)] bg-[var(--home-bg-primary)] shadow-sm transition-[background-color,border-color] duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--home-accent-color)] hover:bg-[var(--home-accent-soft)] hover:shadow-md"
    >
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

          {isMostRecent && (
            <span className="absolute left-2 top-2 z-20 rounded-full border border-[var(--home-accent-color)] bg-[var(--home-accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--home-accent-color)] shadow-sm transition-colors duration-200 group-hover:bg-[var(--home-bg-primary)] group-hover:text-[var(--home-accent-color)]">
              Most Recent
            </span>
          )}
        </div>

        <div className="relative h-[96px] shrink-0 overflow-hidden transition-[height] duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:h-[56px]">
          <div className="absolute inset-0 bg-[var(--home-accent-color)]/0 transition-colors duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-[var(--home-accent-color)]/90" />
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
                  className="inline-flex max-w-[70%] truncate rounded-full border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] px-2 py-1 text-xs font-medium text-[var(--home-text-secondary)] transition-colors duration-200"
                  title={typeLabel}
                >
                  {typeLabel}
                </span>
                <span className="shrink-0 text-xs text-[var(--home-text-secondary)] transition-colors duration-200">
                  {relativeDate}
                </span>
              </div>
            </div>

            <div className="home-diagram-card-meta-compact pointer-events-none absolute inset-0 flex translate-y-[35%] items-center justify-between px-3 py-2 opacity-0 transition-[opacity,transform] duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 group-hover:opacity-100">
              <p
                className="min-w-0 truncate text-sm font-semibold leading-5 text-white"
                title={title}
              >
                {title}
              </p>
              <span className="ml-3 shrink-0 text-xs leading-5 text-white/90">
                {relativeDate}
              </span>
            </div>
          </div>
        </div>
      </button>

      <div ref={menuContainerRef} className="absolute right-2 top-2 z-30">
        <button
          type="button"
          aria-label="Open diagram actions"
          className="cursor-pointer rounded-md border border-transparent bg-[var(--home-bg-card)] p-1.5 text-[var(--home-text-secondary)] opacity-75 shadow-sm transition-colors duration-200 hover:bg-[var(--home-accent-color)] hover:text-white focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2 group-hover:opacity-100"
          onClick={(event) => {
            event.stopPropagation()
            setIsMenuOpen((prevState) => {
              if (prevState) setIsDeleteConfirmOpen(false)
              return !prevState
            })
          }}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="5" r="1.7" fill="currentColor" />
            <circle cx="12" cy="12" r="1.7" fill="currentColor" />
            <circle cx="12" cy="19" r="1.7" fill="currentColor" />
          </svg>
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 z-40 mt-2 w-44 rounded-lg border border-[var(--home-border-color)] bg-[var(--home-bg-card)] p-1 shadow-lg transition-colors duration-200">
            {!isDeleteConfirmOpen ? (
              <div className="space-y-1">
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-[var(--home-text-secondary)] transition-colors duration-200 hover:bg-[var(--home-bg-secondary)] hover:text-[var(--home-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                  onClick={handleOpen}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-[var(--home-text-secondary)] transition-colors duration-200 hover:bg-[var(--home-bg-secondary)] hover:text-[var(--home-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                  onClick={handleDuplicate}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-[var(--apollon-alert-danger-color)] transition-colors duration-200 hover:bg-[var(--apollon-alert-danger-background)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  Delete
                </button>
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
    </div>
  )
}

export const DiagramCard = memo(DiagramCardComponent)
