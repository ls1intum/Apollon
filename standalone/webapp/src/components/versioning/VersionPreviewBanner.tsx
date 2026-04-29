import { Alert, Button, Stack, Typography } from "@mui/material"
import { type FC } from "react"
import { useVersionStore } from "@/stores/useVersionStore"
import { versioningStrings as t } from "./strings"
import { relativeTime } from "./relativeTime"

interface Props {
  diagramId: string
  onExit: () => void
  onRestore: (versionId: string) => void
}

export const VersionPreviewBanner: FC<Props> = ({
  diagramId,
  onExit,
  onRestore,
}) => {
  const preview = useVersionStore((s) => s.preview)
  const versions = useVersionStore((s) => s.versions[diagramId] ?? [])
  if (!preview) return null
  const summary = versions.find((v) => v.id === preview.versionId)
  const name = summary?.name || t.unnamed
  const ago = summary ? relativeTime(summary.createdAt) : ""

  return (
    <Alert
      severity="info"
      action={
        <Stack direction="row" spacing={1}>
          <Button color="inherit" size="small" onClick={onExit}>
            {t.exitPreview}
          </Button>
          <Button
            color="warning"
            size="small"
            variant="contained"
            onClick={() => onRestore(preview.versionId)}
          >
            {t.restoreThis}
          </Button>
        </Stack>
      }
    >
      <Typography variant="body2">{t.previewBanner(name, ago)}</Typography>
    </Alert>
  )
}
