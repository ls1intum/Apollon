import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  List,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import { useEffect, useMemo, useState, type FC } from "react"
import { toast } from "react-toastify"
import { useEditorContext, useModalContext } from "@/contexts"
import { useVersionStore, type PendingVersion } from "@/stores/useVersionStore"
import { ApiError } from "@/services/DiagramApiClient"
import { versioningStrings as t } from "./strings"
import { relativeTime } from "./relativeTime"
import { VersionListItem } from "./VersionListItem"
import { VersionCompareBanner } from "./VersionCompareBanner"

const MAX_VERSIONS = Number(
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_MAX_VERSIONS_PER_DIAGRAM ?? 50
)
const MAX_DESCRIPTION_LENGTH = 240

interface Props {
  diagramId: string
}

/**
 * The complete version-history drawer. Header (title + counter + dirty
 * indicator) + create form + list + compare banner + skeleton + empty state,
 * all in one component because each individual sub-piece is small enough that
 * splitting would only add navigation cost.
 */
export const VersionDrawer: FC<Props> = ({ diagramId }) => {
  const theme = useTheme()
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"))
  const open = useVersionStore((s) => Boolean(s.drawerOpenByDiagram[diagramId]))
  const closeDrawer = useVersionStore((s) => s.closeDrawer)
  const versions = useVersionStore((s) => s.versions[diagramId] ?? [])
  const nextCursor = useVersionStore((s) => s.nextCursor[diagramId])
  const loading = useVersionStore((s) => s.loading)
  const errorCode = useVersionStore((s) => s.error)
  const fetchVersions = useVersionStore((s) => s.fetchVersions)
  const loadMoreVersions = useVersionStore((s) => s.loadMoreVersions)
  const createVersion = useVersionStore((s) => s.createVersion)
  const enterPreview = useVersionStore((s) => s.enterPreview)
  const restoreVersion = useVersionStore((s) => s.restoreVersion)
  const compareState = useVersionStore((s) => s.compare)

  const { editor } = useEditorContext()
  const { openModal } = useModalContext()

  const [draft, setDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [activeRowId, setActiveRowId] = useState<string | null>(null)

  useEffect(() => {
    if (open) void fetchVersions(diagramId)
  }, [open, diagramId, fetchVersions])

  const groupedVersions = useMemo(() => groupAutoRuns(versions), [versions])

  const latestVersion = versions[0]
  const headerSubtitle = latestVersion
    ? t.lastVersion(
        latestVersion.name || t.unnamed,
        relativeTime(latestVersion.createdAt)
      )
    : t.noVersionYet

  const handleCreate = async () => {
    if (!editor || submitting) return
    setSubmitting(true)
    const lines = draft.split("\n")
    const name = (lines[0] ?? "").trim()
    const description = lines.slice(1).join("\n").trim()
    try {
      await createVersion(diagramId, editor.model, {
        name,
        description: description || undefined,
      })
      setDraft("")
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "BODY_TOO_LARGE") toast.error(t.failureBodyTooLarge)
        else toast.error(t.failureToCreate)
      } else {
        toast.error(t.failureToCreate)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handlePreview = async (versionId: string) => {
    if (!editor) return
    try {
      await enterPreview(diagramId, versionId, editor.model)
    } catch {
      toast.error("Failed to load preview.")
    }
  }

  const handleRestore = async (versionId: string) => {
    if (!editor) return
    try {
      const { autoSnapshotVersionId } = await restoreVersion(
        diagramId,
        versionId,
        editor.model
      )
      // The undo-restore snackbar is rendered globally (separate component).
      void autoSnapshotVersionId
    } catch (err) {
      if (err instanceof ApiError && err.code === "SCHEMA_UNSUPPORTED") {
        toast.error(t.failureSchemaUnsupported)
      } else {
        toast.error("Restore failed.")
      }
    }
  }

  const handleDelete = (versionId: string) => {
    openModal("DELETE_VERSION", { diagramId, versionId })
  }

  return (
    <Drawer
      anchor={isSmall ? "bottom" : "right"}
      open={open}
      onClose={() => closeDrawer(diagramId)}
      PaperProps={{
        sx: {
          width: isSmall ? "100%" : 400,
          height: isSmall ? "80vh" : "100%",
          maxWidth: "100vw",
        },
      }}
      role="complementary"
      aria-label={t.drawerTitle}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h6">{t.drawerTitle}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t.counter(
                versions.filter((v) => !v.pending).length,
                MAX_VERSIONS
              )}
            </Typography>
          </Box>
          <IconButton
            onClick={() => closeDrawer(diagramId)}
            aria-label="Close version history"
          >
            <CloseIcon />
          </IconButton>
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.5 }}
        >
          {headerSubtitle}
        </Typography>
      </Box>

      {/* Inline create form */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <TextField
          multiline
          rows={2}
          size="small"
          placeholder={t.createPlaceholder}
          value={draft}
          onChange={(e) =>
            setDraft(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))
          }
          inputProps={{
            "aria-label": "Version name and description",
          }}
        />
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="caption" color="text.secondary">
            {draft.length} / {MAX_DESCRIPTION_LENGTH}
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={handleCreate}
            disabled={submitting || !editor}
          >
            {submitting ? <CircularProgress size={14} /> : t.createButton}
          </Button>
        </Stack>
      </Box>

      {/* Compare banner — shows above the list when active */}
      {compareState && (
        <Box sx={{ p: 1 }}>
          <VersionCompareBanner diagramId={diagramId} />
        </Box>
      )}

      {/* Body */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {errorCode === "REDIS_UNAVAILABLE" ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="warning.main">
              {t.failureRedis}
            </Typography>
          </Box>
        ) : loading && versions.length === 0 ? (
          <List>
            {[0, 1, 2].map((i) => (
              <Box key={i} sx={{ p: 2, display: "flex", gap: 1.5 }}>
                <Skeleton variant="rectangular" width={64} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="60%" />
                  <Skeleton width="30%" />
                </Box>
              </Box>
            ))}
          </List>
        ) : versions.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {t.emptyTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t.emptyBody}
            </Typography>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={submitting || !editor}
            >
              {t.emptyCta}
            </Button>
          </Box>
        ) : (
          <List
            role="listbox"
            aria-label={t.drawerTitle}
            tabIndex={0}
            onKeyDown={(e) => {
              const flat = versions.filter((v) => !v.pending)
              if (flat.length === 0) return
              const idx = flat.findIndex((v) => v.id === activeRowId)
              if (e.key === "ArrowDown") {
                e.preventDefault()
                const next = flat[Math.min(idx + 1, flat.length - 1)] ?? flat[0]
                if (next) setActiveRowId(next.id)
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                const next = flat[Math.max(idx - 1, 0)] ?? flat[0]
                if (next) setActiveRowId(next.id)
              } else if (e.key === "Enter" && activeRowId) {
                e.preventDefault()
                handlePreview(activeRowId)
              } else if (e.key === "Delete" && activeRowId) {
                e.preventDefault()
                handleDelete(activeRowId)
              }
            }}
          >
            {groupedVersions.map((entry) =>
              entry.kind === "auto-group" ? (
                <AutoGroupRow
                  key={entry.first.id}
                  group={entry}
                  diagramId={diagramId}
                  onPreview={handlePreview}
                  onRestore={handleRestore}
                  onDelete={handleDelete}
                  activeRowId={activeRowId}
                  setActiveRowId={setActiveRowId}
                />
              ) : (
                <VersionListItem
                  key={entry.version.id}
                  diagramId={diagramId}
                  version={entry.version}
                  isPreviewing={entry.version.id === activeRowId}
                  onPreview={handlePreview}
                  onRestore={handleRestore}
                  onDelete={handleDelete}
                />
              )
            )}
            {nextCursor && (
              <Box sx={{ px: 2, py: 1.5, textAlign: "center" }}>
                <Button
                  size="small"
                  onClick={() => loadMoreVersions(diagramId)}
                  disabled={loading}
                >
                  Load older versions
                </Button>
              </Box>
            )}
          </List>
        )}
      </Box>
    </Drawer>
  )
}

// ---------------------------------------------------------------------------
// Auto-snapshot grouping — collapse consecutive auto rows under an expander.
// ---------------------------------------------------------------------------

type GroupedEntry =
  | { kind: "single"; version: PendingVersion }
  | {
      kind: "auto-group"
      first: PendingVersion
      versions: PendingVersion[]
    }

function groupAutoRuns(versions: PendingVersion[]): GroupedEntry[] {
  const out: GroupedEntry[] = []
  let i = 0
  while (i < versions.length) {
    const v = versions[i]!
    if (v.kind !== "auto") {
      out.push({ kind: "single", version: v })
      i++
      continue
    }
    const run: PendingVersion[] = []
    while (i < versions.length && versions[i]!.kind === "auto") {
      run.push(versions[i]!)
      i++
    }
    if (run.length === 1) {
      out.push({ kind: "single", version: run[0]! })
    } else {
      out.push({ kind: "auto-group", first: run[0]!, versions: run })
    }
  }
  return out
}

interface AutoGroupRowProps {
  group: Extract<GroupedEntry, { kind: "auto-group" }>
  diagramId: string
  onPreview: (id: string) => void
  onRestore: (id: string) => void
  onDelete: (id: string) => void
  activeRowId: string | null
  setActiveRowId: (id: string | null) => void
}

const AutoGroupRow: FC<AutoGroupRowProps> = ({
  group,
  diagramId,
  onPreview,
  onRestore,
  onDelete,
  activeRowId,
}) => {
  const [expanded, setExpanded] = useState(false)
  return (
    <Box>
      <Box
        component="button"
        type="button"
        onClick={() => setExpanded((v) => !v)}
        sx={{
          width: "100%",
          textAlign: "left",
          background: "transparent",
          border: 0,
          p: 1.5,
          color: "text.secondary",
          cursor: "pointer",
          fontSize: "0.85rem",
        }}
        aria-expanded={expanded}
        aria-label={`${group.versions.length} auto-saved versions`}
      >
        {expanded ? "▾" : "▸"} {group.versions.length} auto-saved versions
      </Box>
      {expanded &&
        group.versions.map((v) => (
          <VersionListItem
            key={v.id}
            diagramId={diagramId}
            version={v}
            isPreviewing={v.id === activeRowId}
            onPreview={onPreview}
            onRestore={onRestore}
            onDelete={onDelete}
          />
        ))}
    </Box>
  )
}
