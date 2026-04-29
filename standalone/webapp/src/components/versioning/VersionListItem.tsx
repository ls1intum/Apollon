import {
  IconButton,
  ListItem,
  ListItemSecondaryAction,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
  Box,
} from "@mui/material"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import { VersionThumbnail } from "./VersionThumbnail"
import { useState, type FC, type MouseEvent } from "react"
import { toast } from "react-toastify"
import { log } from "@/logger"
import { useVersionStore, type PendingVersion } from "@/stores/useVersionStore"
import { VersionApiClient } from "@/services/DiagramApiClient"
import { versioningStrings as t } from "./strings"
import { relativeTime } from "./relativeTime"

interface Props {
  diagramId: string
  version: PendingVersion
  isPreviewing: boolean
  onPreview: (versionId: string) => void
  onRestore: (versionId: string) => void
  onDelete: (versionId: string) => void
}

export const VersionListItem: FC<Props> = ({
  diagramId,
  version,
  isPreviewing,
  onPreview,
  onRestore,
  onDelete,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(version.name)
  const editVersionInfo = useVersionStore((s) => s.editVersionInfo)
  const startCompare = useVersionStore((s) => s.startCompare)

  const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
    setMenuAnchor(e.currentTarget)
  }
  const closeMenu = () => setMenuAnchor(null)

  const submitRename = async () => {
    setEditing(false)
    if (!draftName.trim() || draftName === version.name) return
    try {
      await editVersionInfo(diagramId, version.id, { name: draftName.trim() })
    } catch (err) {
      log.error("Rename failed", err)
      toast.error(t.failureToCreate)
      setDraftName(version.name)
    }
  }

  const copyLink = async () => {
    closeMenu()
    try {
      await navigator.clipboard.writeText(
        VersionApiClient.permalink(diagramId, version.id)
      )
      toast.success(t.copied)
    } catch (err) {
      log.error("Copy link failed", err)
      toast.error("Failed to copy link.")
    }
  }

  const isAuto = version.kind === "auto"
  const ago = relativeTime(version.createdAt)

  return (
    <ListItem
      role="option"
      aria-selected={isPreviewing}
      aria-label={`Version '${version.name || t.unnamed}', created ${ago}, ${
        isAuto ? "auto-saved before restore" : "user snapshot"
      }`}
      sx={{
        opacity: version.pending ? 0.7 : 1,
        // Theme-aware: app uses CSS custom properties on `documentElement`
        // (see `useThemeStore` + `themings.json`), not MUI's ThemeProvider.
        // MUI palette tokens (action.selected/hover, text.secondary) ignore
        // the app's dark toggle and have to be replaced with `--apollon-*`.
        bgcolor: isPreviewing
          ? "var(--apollon-background-variant)"
          : "transparent",
        borderLeft: version.failed
          ? "3px solid var(--apollon-alert-danger-color)"
          : "3px solid transparent",
        color: "var(--apollon-primary-contrast)",
        gap: 1.5,
        py: 1,
        "&:hover": {
          bgcolor: "var(--apollon-background-variant)",
        },
      }}
    >
      {version.pending ? (
        <Box
          sx={{
            width: 64,
            height: 40,
            flexShrink: 0,
            bgcolor: "var(--apollon-background-variant)",
            borderRadius: 1,
          }}
          aria-hidden
        />
      ) : (
        <VersionThumbnail
          diagramId={diagramId}
          versionId={version.id}
          isAuto={isAuto}
          compact
        />
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <TextField
            autoFocus
            size="small"
            fullWidth
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                ;(e.currentTarget as HTMLInputElement).blur()
              } else if (e.key === "Escape") {
                setDraftName(version.name)
                setEditing(false)
              }
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "var(--apollon-primary-contrast)",
                backgroundColor: "var(--apollon-background)",
                "& fieldset": {
                  borderColor: "var(--apollon-switch-box-border-color)",
                },
                "&:hover fieldset": {
                  borderColor: "var(--apollon-primary-contrast)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "var(--apollon-primary)",
                },
              },
            }}
          />
        ) : (
          <Tooltip title={version.name || t.unnamed}>
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              onDoubleClick={() => setEditing(true)}
              sx={{
                cursor: "text",
                color: "var(--apollon-primary-contrast)",
              }}
            >
              {version.name || t.unnamed}
            </Typography>
          </Tooltip>
        )}
        {version.description && (
          <Tooltip title={version.description}>
            <Typography
              variant="caption"
              noWrap
              sx={{
                display: "block",
                color: "var(--apollon-secondary)",
              }}
            >
              {version.description}
            </Typography>
          </Tooltip>
        )}
        <Typography
          variant="caption"
          sx={{ color: "var(--apollon-secondary)" }}
        >
          {ago}
          {isAuto && ` · ${t.autoSnapshot}`}
          {version.pending && ` · ${t.saving}`}
          {version.failed && ` · failed`}
        </Typography>
      </Box>

      <ListItemSecondaryAction>
        <IconButton
          size="small"
          onClick={openMenu}
          aria-label={`Actions for version '${version.name || t.unnamed}'`}
          disabled={Boolean(version.pending)}
          sx={{ color: "var(--apollon-primary-contrast)" }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </ListItemSecondaryAction>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: "var(--apollon-background)",
              color: "var(--apollon-primary-contrast)",
              border: "1px solid var(--apollon-switch-box-border-color)",
              "& .MuiMenuItem-root": {
                color: "var(--apollon-primary-contrast)",
                "&:hover": {
                  backgroundColor: "var(--apollon-background-variant)",
                },
              },
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            closeMenu()
            onPreview(version.id)
          }}
        >
          {t.preview}
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            onRestore(version.id)
          }}
        >
          {t.restore}
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            startCompare(diagramId, version.id, "current")
          }}
        >
          {t.compareWithCurrent}
        </MenuItem>
        <MenuItem onClick={copyLink}>{t.copyLink}</MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            setEditing(true)
          }}
        >
          {t.edit}
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            onDelete(version.id)
          }}
          sx={{ color: "var(--apollon-alert-danger-color) !important" }}
        >
          {t.delete}
        </MenuItem>
      </Menu>
    </ListItem>
  )
}
