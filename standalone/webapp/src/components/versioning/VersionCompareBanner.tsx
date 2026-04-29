import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import CloseIcon from "@mui/icons-material/Close"
import { useEffect, useMemo, useState, type FC } from "react"
import { diffModel, type DiagramDiff, type UMLModel } from "@tumaet/apollon"
import { useEditorContext } from "@/contexts"
import { useVersionStore } from "@/stores/useVersionStore"
import { VersionApiClient } from "@/services/DiagramApiClient"
import { versioningStrings as t } from "./strings"

const COMPARE_PREVIEW_LIMIT = 8

interface Props {
  diagramId: string
}

export const VersionCompareBanner: FC<Props> = ({ diagramId }) => {
  const compare = useVersionStore((s) => s.compare)
  const swap = useVersionStore((s) => s.swapCompare)
  const close = useVersionStore((s) => s.closeCompare)
  const versions = useVersionStore((s) => s.versions[diagramId] ?? [])
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

  const renderEntries = (
    label: string,
    entries: Array<{ id: string; name: string; type: string }>
  ) =>
    entries.length === 0 ? null : (
      <Box>
        <Typography variant="caption" fontWeight={700}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {entries
            .map((e) => e.name || e.id.slice(0, 6))
            .slice(0, COMPARE_PREVIEW_LIMIT)
            .join(", ")}
          {entries.length > COMPARE_PREVIEW_LIMIT ? `, …` : ""}
        </Typography>
      </Box>
    )

  const totalChanges = diff
    ? diff.totals.nodesAdded +
      diff.totals.nodesRemoved +
      diff.totals.nodesChanged +
      diff.totals.edgesAdded +
      diff.totals.edgesRemoved +
      diff.totals.edgesChanged
    : 0

  return (
    <Alert
      severity="info"
      icon={false}
      sx={{ alignItems: "stretch" }}
      action={
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Button
            size="small"
            startIcon={<SwapHorizIcon />}
            onClick={swap}
            aria-label={t.swapCompare}
          >
            {t.swapCompare}
          </Button>
          <Button
            size="small"
            startIcon={<CloseIcon />}
            onClick={close}
            aria-label={t.closeCompare}
          >
            {t.closeCompare}
          </Button>
        </Stack>
      }
    >
      <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
        Comparing <strong>{baseLabel}</strong> → <strong>{compLabel}</strong>
      </Typography>
      {loadError ? (
        <Typography variant="body2" color="error">
          {loadError}
        </Typography>
      ) : loading ? (
        <CircularProgress size={16} />
      ) : !diff ? (
        <Typography variant="body2" color="text.secondary">
          {t.diffEmpty}
        </Typography>
      ) : totalChanges === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t.diffEmpty}
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {renderEntries(
            `${t.diffAdded} (${diff.totals.nodesAdded + diff.totals.edgesAdded})`,
            [...diff.added.nodes, ...diff.added.edges]
          )}
          {renderEntries(
            `${t.diffRemoved} (${diff.totals.nodesRemoved + diff.totals.edgesRemoved})`,
            [...diff.removed.nodes, ...diff.removed.edges]
          )}
          {renderEntries(
            `${t.diffChanged} (${diff.totals.nodesChanged + diff.totals.edgesChanged})`,
            [...diff.changed.nodes, ...diff.changed.edges]
          )}
        </Stack>
      )}
    </Alert>
  )
}
