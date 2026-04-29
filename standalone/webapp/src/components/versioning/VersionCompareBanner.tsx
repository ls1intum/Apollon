import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import CloseIcon from "@mui/icons-material/Close"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import { useEffect, useMemo, useState, type FC } from "react"
import {
  diffModel,
  type ChangedElement,
  type DiagramDiff,
  type DiffElementSummary,
  type UMLModel,
} from "@tumaet/apollon"
import { useEditorContext } from "@/contexts"
import { selectVersions, useVersionStore } from "@/stores/useVersionStore"
import { VersionApiClient } from "@/services/DiagramApiClient"
import { versioningStrings as t } from "./strings"
import { VersionThumbnail } from "./VersionThumbnail"

interface Props {
  diagramId: string
}

export const VersionCompareBanner: FC<Props> = ({ diagramId }) => {
  const compare = useVersionStore((s) => s.compare)
  const swap = useVersionStore((s) => s.swapCompare)
  const close = useVersionStore((s) => s.closeCompare)
  const versions = useVersionStore((s) => selectVersions(s, diagramId))
  const { editor } = useEditorContext()
  const [baselineModel, setBaselineModel] = useState<UMLModel | undefined>()
  const [comparandModel, setComparandModel] = useState<UMLModel | undefined>()
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!compare) return
    setLoading(true)
    setLoadError(null)
    setBaselineModel(undefined)
    setComparandModel(undefined)
    let cancelled = false
    const resolveModel = (
      ref: string | "current"
    ): Promise<UMLModel | undefined> =>
      ref === "current"
        ? Promise.resolve(editor?.model)
        : VersionApiClient.getBody(diagramId, ref)
    Promise.all([
      resolveModel(compare.baseline),
      resolveModel(compare.comparand),
    ])
      .then(([a, b]) => {
        if (cancelled) return
        setBaselineModel(a)
        setComparandModel(b)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(
          err instanceof Error ? err.message : "Could not load versions."
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [compare, diagramId, editor])

  const diff: DiagramDiff | null = useMemo(() => {
    if (!baselineModel || !comparandModel) return null
    return diffModel(baselineModel, comparandModel)
  }, [baselineModel, comparandModel])

  if (!compare) return null

  const baseLabel =
    compare.baseline === "current"
      ? t.currentCanvas
      : versions.find((v) => v.id === compare.baseline)?.name || t.unnamed
  const compLabel =
    compare.comparand === "current"
      ? t.currentCanvas
      : versions.find((v) => v.id === compare.comparand)?.name || t.unnamed

  const totalChanges = diff
    ? diff.totals.nodesAdded +
      diff.totals.nodesRemoved +
      diff.totals.nodesChanged +
      diff.totals.edgesAdded +
      diff.totals.edgesRemoved +
      diff.totals.edgesChanged
    : 0

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        // App theming is via CSS custom properties on `documentElement`,
        // not MUI ThemeProvider. Use `--apollon-*` so the compare banner
        // follows the app's light/dark toggle.
        bgcolor: "var(--apollon-background-variant)",
        borderColor: "var(--apollon-switch-box-border-color)",
        color: "var(--apollon-primary-contrast)",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Typography
          variant="caption"
          sx={{ color: "var(--apollon-secondary)" }}
        >
          {t.diffChanged}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            onClick={swap}
            aria-label={t.swapCompare}
            title={t.swapCompare}
            sx={{ color: "var(--apollon-primary-contrast)" }}
          >
            <SwapHorizIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={close}
            aria-label={t.closeCompare}
            title={t.closeCompare}
            sx={{ color: "var(--apollon-primary-contrast)" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
      {/* Side-by-side thumbnails so the user sees what they're comparing
          before they read the diff text. "current" shows a placeholder
          card because thumbnails are server-rendered from stored snapshots
          only — the live editor doesn't have a server-side render. */}
      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1 }}>
        <ComparePane
          label={baseLabel}
          ref={compare.baseline}
          diagramId={diagramId}
        />
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            color: "var(--apollon-secondary)",
          }}
        >
          →
        </Box>
        <ComparePane
          label={compLabel}
          ref={compare.comparand}
          diagramId={diagramId}
        />
      </Stack>

      {loadError ? (
        <Typography
          variant="body2"
          sx={{ color: "var(--apollon-alert-danger-color)" }}
        >
          {loadError}
        </Typography>
      ) : loading ? (
        <CircularProgress size={16} sx={{ color: "var(--apollon-primary)" }} />
      ) : !diff || totalChanges === 0 ? (
        <Typography variant="body2" sx={{ color: "var(--apollon-secondary)" }}>
          {t.diffEmpty}
        </Typography>
      ) : (
        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
          <DiffSection
            kind="added"
            label={t.diffAdded}
            count={diff.totals.nodesAdded + diff.totals.edgesAdded}
            entries={[...diff.added.nodes, ...diff.added.edges]}
          />
          <DiffSection
            kind="removed"
            label={t.diffRemoved}
            count={diff.totals.nodesRemoved + diff.totals.edgesRemoved}
            entries={[...diff.removed.nodes, ...diff.removed.edges]}
          />
          <ChangedSection
            count={diff.totals.nodesChanged + diff.totals.edgesChanged}
            entries={[...diff.changed.nodes, ...diff.changed.edges]}
            baseline={baselineModel}
            comparand={comparandModel}
          />
        </Stack>
      )}
    </Paper>
  )
}

// Semantic accent colours for the diff stripes. The MUI palette tokens
// (`success.main`, `error.main`, `warning.main`) are theme-blind in this
// app — there's no MUI ThemeProvider — so we use static hexes that read
// as added/removed/changed in both light and dark backgrounds.
const STRIPE_COLOR: Record<"added" | "removed" | "changed", string> = {
  added: "#22c55e",
  removed: "#ef4444",
  changed: "#f59e0b",
}

interface ComparePaneProps {
  label: string
  ref: string | "current"
  diagramId: string
}

const ComparePane: FC<ComparePaneProps> = ({ label, ref, diagramId }) => (
  <Box sx={{ flex: 1, minWidth: 0 }}>
    <Typography
      variant="caption"
      sx={{
        display: "block",
        fontWeight: 600,
        mb: 0.5,
        color: "var(--apollon-primary-contrast)",
      }}
      noWrap
      title={label}
    >
      {label}
    </Typography>
    {ref === "current" ? (
      <Box
        sx={{
          height: 100,
          bgcolor: "var(--apollon-background)",
          border: "1px solid var(--apollon-switch-box-border-color)",
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--apollon-secondary)",
          fontSize: "0.75rem",
        }}
        aria-hidden
      >
        {t.currentCanvas}
      </Box>
    ) : (
      <VersionThumbnail diagramId={diagramId} versionId={ref} compact={false} />
    )}
  </Box>
)

interface DiffSectionProps {
  kind: "added" | "removed"
  label: string
  count: number
  entries: DiffElementSummary[]
}

const DiffSection: FC<DiffSectionProps> = ({ kind, label, count, entries }) => {
  if (entries.length === 0) return null
  return (
    <Box>
      <Typography
        variant="caption"
        fontWeight={700}
        sx={{
          display: "block",
          color: "var(--apollon-primary-contrast)",
        }}
      >
        {label} ({count})
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {entries.map((e) => (
          <Box
            component="li"
            key={`${kind}-${e.id}`}
            sx={{
              borderLeft: `2px solid ${STRIPE_COLOR[kind]}`,
              pl: 1,
              mb: 0.25,
              listStyle: "none",
              fontSize: "0.85rem",
              color: "var(--apollon-primary-contrast)",
            }}
          >
            <Box component="span" sx={{ fontWeight: 600 }}>
              {e.name || e.id.slice(0, 8)}
            </Box>{" "}
            <Box component="span" sx={{ color: "var(--apollon-secondary)" }}>
              · {e.type}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

interface ChangedSectionProps {
  count: number
  entries: ChangedElement[]
  baseline: UMLModel | undefined
  comparand: UMLModel | undefined
}

const ChangedSection: FC<ChangedSectionProps> = ({
  count,
  entries,
  baseline,
  comparand,
}) => {
  if (entries.length === 0) return null
  return (
    <Box>
      <Typography
        variant="caption"
        fontWeight={700}
        sx={{
          display: "block",
          color: "var(--apollon-primary-contrast)",
        }}
      >
        {t.diffChanged} ({count})
      </Typography>
      <Stack spacing={0.25}>
        {entries.map((e) => (
          <ChangedRow
            key={`changed-${e.id}`}
            element={e}
            baseline={baseline}
            comparand={comparand}
          />
        ))}
      </Stack>
    </Box>
  )
}

const ChangedRow: FC<{
  element: ChangedElement
  baseline: UMLModel | undefined
  comparand: UMLModel | undefined
}> = ({ element, baseline, comparand }) => {
  const [expanded, setExpanded] = useState(false)
  const beforeRecord = useMemo(
    () => findElement(baseline, element.id),
    [baseline, element.id]
  )
  const afterRecord = useMemo(
    () => findElement(comparand, element.id),
    [comparand, element.id]
  )
  return (
    <Box
      sx={{
        borderLeft: `2px solid ${STRIPE_COLOR.changed}`,
        pl: 1,
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={() => setExpanded((v) => !v)}
        sx={{
          background: "transparent",
          border: 0,
          p: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          textAlign: "left",
          fontSize: "0.85rem",
          width: "100%",
          color: "var(--apollon-primary-contrast)",
        }}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ExpandLessIcon fontSize="inherit" aria-hidden />
        ) : (
          <ExpandMoreIcon fontSize="inherit" aria-hidden />
        )}
        <Box component="span" sx={{ fontWeight: 600 }}>
          {element.name || element.id.slice(0, 8)}
        </Box>
        <Box component="span" sx={{ color: "var(--apollon-secondary)" }}>
          · {element.type} · {element.fields.length} field
          {element.fields.length === 1 ? "" : "s"}
        </Box>
      </Box>
      {expanded && (
        <Box component="ul" sx={{ m: 0.5, pl: 2.5 }}>
          {element.fields.map((field) => (
            <Box
              component="li"
              key={field}
              sx={{
                listStyle: "none",
                fontSize: "0.8rem",
                color: "var(--apollon-secondary)",
                fontFamily: "monospace",
              }}
            >
              <Box
                component="span"
                sx={{ color: "var(--apollon-primary-contrast)" }}
              >
                {field}
              </Box>
              : <FieldValue record={beforeRecord} path={field} />
              {" → "}
              <FieldValue record={afterRecord} path={field} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

const FieldValue: FC<{ record: unknown; path: string }> = ({
  record,
  path,
}) => {
  const value = useMemo(() => readFieldByPath(record, path), [record, path])
  return <Box component="span">{formatValue(value)}</Box>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findElement(
  model: UMLModel | undefined,
  id: string
): unknown | undefined {
  if (!model) return undefined
  return (
    model.nodes.find((n) => n.id === id) ?? model.edges.find((e) => e.id === id)
  )
}

function readFieldByPath(record: unknown, path: string): unknown {
  if (!record || typeof record !== "object") return undefined
  const segments = path.split(".")
  let cursor: unknown = record
  for (const seg of segments) {
    if (cursor === null || cursor === undefined || typeof cursor !== "object")
      return undefined
    cursor = (cursor as Record<string, unknown>)[seg]
  }
  return cursor
}

function formatValue(value: unknown): string {
  if (value === undefined) return "—"
  if (value === null) return "null"
  if (typeof value === "string") return JSON.stringify(value)
  if (typeof value === "number" || typeof value === "boolean")
    return String(value)
  if (Array.isArray(value)) return `[…${value.length}]`
  if (typeof value === "object") {
    try {
      const json = JSON.stringify(value)
      return json.length > 60 ? json.slice(0, 57) + "…" : json
    } catch {
      return "{…}"
    }
  }
  return String(value)
}
