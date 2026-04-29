import { Box, Button, Paper, Stack, Typography } from "@mui/material"
import { type FC } from "react"
import { selectVersions, useVersionStore } from "@/stores/useVersionStore"
import { versioningStrings as t } from "./strings"
import { relativeTime } from "./relativeTime"

interface Props {
  diagramId: string
  onExit: () => void
  onRestore: (versionId: string) => void
}

/**
 * Read-only preview banner. App theming is via CSS custom properties on
 * `documentElement` (see `useThemeStore` + `themings.json`), not MUI's
 * ThemeProvider — `<Alert severity="info">` ships hard-coded blue tints
 * that ignore the dark toggle, so this is a custom Paper using the
 * `--apollon-*` palette instead.
 */
export const VersionPreviewBanner: FC<Props> = ({
  diagramId,
  onExit,
  onRestore,
}) => {
  const preview = useVersionStore((s) => s.preview)
  const versions = useVersionStore((s) => selectVersions(s, diagramId))
  if (!preview) return null
  const summary = versions.find((v) => v.id === preview.versionId)
  const name = summary?.name || t.unnamed
  const ago = summary ? relativeTime(summary.createdAt) : ""

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        bgcolor: "var(--apollon-background-variant)",
        borderLeft: "3px solid var(--apollon-primary)",
        borderRadius: 1,
        color: "var(--apollon-primary-contrast)",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ flexWrap: "wrap" }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{ color: "var(--apollon-primary-contrast)" }}
          >
            {t.previewBanner(name, ago)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            onClick={onExit}
            sx={{
              textTransform: "none",
              color: "var(--apollon-primary-contrast)",
              borderColor: "var(--apollon-switch-box-border-color)",
              "&:hover": {
                backgroundColor: "var(--apollon-background)",
              },
            }}
            variant="outlined"
          >
            {t.exitPreview}
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => onRestore(preview.versionId)}
            sx={{
              textTransform: "none",
              backgroundColor: "var(--apollon-primary)",
              "&:hover": {
                backgroundColor: "var(--apollon-primary)",
                opacity: 0.9,
              },
            }}
          >
            {t.restoreThis}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
