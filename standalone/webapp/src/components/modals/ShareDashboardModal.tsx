import { useEffect, useRef, useState } from "react"
import { Tooltip } from "@mui/material"
import Info from "@mui/icons-material/Info"
import { toast } from "react-toastify"
import { useNavigate } from "react-router"
import { useModalContext } from "@/contexts"
import { useModalProgress } from "@/contexts/ModalProgressContext"
import { DiagramView } from "@/types"
import { DiagramApiClient } from "@/services/DiagramApiClient"
import { log } from "@/logger"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import {
  addSharedDiagramEntry,
  markSharedDiagramCopied,
  updateSharedDiagramView,
} from "@/utils/sharedDiagramStorage"
import { randomCollabName } from "@tumaet/apollon"
import {
  buildSharedDiagramPath,
  buildSharedDiagramUrl,
} from "@/utils/sharedDiagramLinks"
import {
  HomeDialogActions,
  HomeDialogContent,
  HomeDialogField,
  HomeDialogNotice,
  HomeDialogTextInput,
} from "./HomeDialog"

type ShareDashboardModalProps = {
  modelId?: string
}

const resolveProps = (props: unknown): ShareDashboardModalProps => {
  if (!props || typeof props !== "object") return {}
  const candidate = props as ShareDashboardModalProps
  return {
    modelId:
      typeof candidate.modelId === "string" ? candidate.modelId : undefined,
  }
}

type Phase = "form" | "creating"

const MODE_OPTIONS: { value: DiagramView; label: string }[] = [
  { value: DiagramView.EDIT, label: "Edit" },
  { value: DiagramView.COLLABORATE, label: "Collaborate" },
  { value: DiagramView.GIVE_FEEDBACK, label: "Add feedback" },
  { value: DiagramView.SEE_FEEDBACK, label: "View feedback" },
]

const CopyIcon = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
  >
    <rect
      x="9"
      y="9"
      width="13"
      height="13"
      rx="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const CheckIcon = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ShareDashboardModal = (props: unknown) => {
  const { modelId } = resolveProps(props)
  const { closeModal } = useModalContext()
  const navigate = useNavigate()

  const persistedModel = usePersistenceModelStore((state) =>
    modelId ? state.models[modelId] : null
  )
  const localTitle = persistedModel?.model?.title?.trim() || "Untitled Diagram"
  const modelData = persistedModel?.model ?? null

  const [name, setName] = useState(localTitle)
  const [phase, setPhase] = useState<Phase>("form")
  const [createdDiagramId, setCreatedDiagramId] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<DiagramView>(DiagramView.EDIT)
  const [copied, setCopied] = useState(false)
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const modeTriggerRef = useRef<HTMLButtonElement | null>(null)

  const { setLoading } = useModalProgress()
  useEffect(() => {
    setLoading(phase === "creating")
  }, [phase, setLoading])
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const currentLink = createdDiagramId
    ? buildSharedDiagramUrl(createdDiagramId, activeMode)
    : ""

  const handleCreate = async () => {
    if (!modelData) {
      toast.error("Diagram data is not available for sharing.")
      return
    }
    setPhase("creating")
    try {
      const modelToShare =
        name.trim() && name.trim() !== modelData.title
          ? { ...modelData, title: name.trim() }
          : modelData

      const collabName =
        sessionStorage.getItem("apollon-collab-name") || randomCollabName()
      sessionStorage.setItem("apollon-collab-name", collabName)

      const { id: diagramId } =
        await DiagramApiClient.createDiagram(modelToShare)
      addSharedDiagramEntry(diagramId)

      setCreatedDiagramId(diagramId)
      setActiveMode(DiagramView.EDIT)
      setPhase("form")
      toast.success("Diagram created successfully.")
    } catch (err) {
      log.error("Error creating shared diagram:", err as Error)
      toast.error("Could not create shared diagram.")
      setPhase("form")
    }
  }

  const handleCopy = async () => {
    if (!currentLink || !createdDiagramId) return
    try {
      await navigator.clipboard.writeText(currentLink)
      markSharedDiagramCopied(createdDiagramId, activeMode)
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy link.")
    }
  }

  const handleModeSelect = (mode: DiagramView) => {
    setActiveMode(mode)
    setModeDropdownOpen(false)
    if (createdDiagramId) {
      updateSharedDiagramView(createdDiagramId, mode)
    }
    void navigator.clipboard
      .writeText(buildSharedDiagramUrl(createdDiagramId!, mode))
      .catch(() => {})
  }

  useEffect(() => {
    if (!modeDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modeTriggerRef.current &&
        !modeTriggerRef.current
          .closest("[data-mode-dropdown]")
          ?.contains(e.target as Node)
      ) {
        setModeDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [modeDropdownOpen])

  const handleOpenDiagram = () => {
    if (!createdDiagramId) return
    closeModal()
    navigate(buildSharedDiagramPath(createdDiagramId, activeMode))
  }

  const activeModeLabel =
    MODE_OPTIONS.find((o) => o.value === activeMode)?.label ?? "Edit"

  return (
    <HomeDialogContent>
      <HomeDialogNotice>
        {createdDiagramId
          ? "Share your diagram as a link — choose edit, live collaboration, or feedback mode."
          : "Creates a live version of this diagram to share for collaboration and feedback."}
        <Tooltip
          title={
            createdDiagramId ? (
              <span
                className="recent-diagrams-font"
                style={{ display: "block", lineHeight: "1.6" }}
              >
                • <b>Edit</b> — view &amp; modify, no live sync
                <br />• <b>Collaborate</b> — real-time multi-user editing
                <br />• <b>Give Feedback</b> — reviewers annotate a read-only
                view
                <br />• <b>Receive Feedback</b> — read-only view of submitted
                annotations
              </span>
            ) : (
              <span className="recent-diagrams-font">
                A snapshot is uploaded to our servers — your local diagram is
                untouched. Links stay active for 120 days and reset whenever
                someone edits.
              </span>
            )
          }
          placement="top"
          arrow
        >
          <Info
            fontSize="small"
            className="ml-1 inline-block cursor-help"
            style={{ color: "var(--home-accent-base)" }}
          />
        </Tooltip>
      </HomeDialogNotice>

      {/* Name field — hidden once diagram is created */}
      {!createdDiagramId && (
        <HomeDialogField label="Name" htmlFor="share-diagram-name">
          <HomeDialogTextInput
            id="share-diagram-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            disabled={phase === "creating"}
            placeholder="Diagram name"
          />
        </HomeDialogField>
      )}

      {createdDiagramId && (
        <HomeDialogField label="Anyone with this link">
          <div className="flex items-stretch">
            <input
              type="text"
              value={currentLink}
              readOnly
              className="h-9 min-w-0 grow rounded-l-md border border-r-0 px-3 text-xs outline-none"
              style={{
                borderColor: "var(--home-border-default)",
                background: "var(--home-surface-sunken)",
                color: "var(--home-text-secondary)",
              }}
            />

            <Tooltip
              title={
                <span className="recent-diagrams-font">
                  {copied ? "Copied!" : "Copy link"}
                </span>
              }
              placement="top"
              arrow
            >
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-9 w-9 shrink-0 items-center justify-center border border-r-0 transition-colors duration-150 hover:opacity-80"
                style={{
                  borderColor: "var(--home-border-default)",
                  background: copied
                    ? "var(--home-accent-soft)"
                    : "var(--home-surface-raised)",
                  color: copied
                    ? "var(--home-accent-base)"
                    : "var(--home-text-secondary)",
                }}
                aria-label="Copy link"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
            </Tooltip>

            <div className="relative" data-mode-dropdown="">
              <button
                ref={modeTriggerRef}
                type="button"
                onClick={() => setModeDropdownOpen((o) => !o)}
                className="flex h-9 items-center gap-1.5 rounded-r-md border px-3 text-xs font-medium transition-colors duration-150 hover:opacity-80"
                style={{
                  borderColor: "var(--home-border-default)",
                  background: "var(--home-surface-raised)",
                  color: "var(--home-text-primary)",
                  minWidth: "max-content",
                }}
                aria-haspopup="listbox"
                aria-expanded={modeDropdownOpen}
              >
                {activeModeLabel}
                <svg
                  className="h-3 w-3 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  aria-hidden="true"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {modeDropdownOpen && (
                <ul
                  role="listbox"
                  className="absolute right-0 top-full z-10 mt-1 min-w-[160px] rounded-lg border p-1"
                  style={{
                    borderColor: "var(--home-border-default)",
                    background: "var(--home-surface-raised)",
                    boxShadow: "0 8px 24px var(--home-shadow-overlay)",
                  }}
                >
                  {MODE_OPTIONS.map((opt) => (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={activeMode === opt.value}
                      onClick={() => handleModeSelect(opt.value)}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors duration-100"
                      style={{
                        background:
                          activeMode === opt.value
                            ? "var(--home-accent-soft)"
                            : "transparent",
                        color:
                          activeMode === opt.value
                            ? "var(--home-accent-strong)"
                            : "var(--home-text-primary)",
                      }}
                      onMouseEnter={(e) => {
                        if (activeMode !== opt.value) {
                          e.currentTarget.style.background =
                            "var(--home-surface-raised-hover)"
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          activeMode === opt.value
                            ? "var(--home-accent-soft)"
                            : "transparent"
                      }}
                    >
                      {activeMode === opt.value && (
                        <svg
                          className="h-3 w-3 shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          aria-hidden="true"
                        >
                          <path
                            d="M20 6 9 17l-5-5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      <span className={activeMode === opt.value ? "" : "pl-5"}>
                        {opt.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </HomeDialogField>
      )}

      <HomeDialogActions
        cancelLabel={createdDiagramId ? "Close" : "Cancel"}
        confirmLabel={createdDiagramId ? "Open diagram" : "Create"}
        loadingLabel="Creating..."
        loading={phase === "creating"}
        confirmDisabled={!createdDiagramId && !name.trim()}
        onCancel={closeModal}
        onConfirm={() =>
          createdDiagramId ? handleOpenDiagram() : void handleCreate()
        }
      />
    </HomeDialogContent>
  )
}
