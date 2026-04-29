import {
  Box,
  IconButton,
  ListItem,
  ListItemSecondaryAction,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded"
import BookmarkRoundedIcon from "@mui/icons-material/BookmarkRounded"
import MoreVertIcon from "@mui/icons-material/MoreVert"
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
  const KindIcon = isAuto ? HistoryRoundedIcon : BookmarkRoundedIcon
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
        bgcolor: isPreviewing ? "action.selected" : undefined,
        borderLeft: version.failed ? "3px solid red" : "3px solid transparent",
        gap: 1.5,
        py: 1,
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isAuto ? "text.secondary" : "primary.main",
        }}
        aria-hidden
      >
        <KindIcon fontSize="small" titleAccess={isAuto ? "Auto" : "User"} />
      </Box>

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
          />
        ) : (
          <Tooltip title={version.name || t.unnamed}>
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              onDoubleClick={() => setEditing(true)}
              sx={{ cursor: "text" }}
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
              sx={{ display: "block", color: "text.secondary" }}
            >
              {version.description}
            </Typography>
          </Tooltip>
        )}
        <Typography variant="caption" color="text.secondary">
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
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </ListItemSecondaryAction>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
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
          sx={{ color: "error.main" }}
        >
          {t.delete}
        </MenuItem>
      </Menu>
    </ListItem>
  )
}
