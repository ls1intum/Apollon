import { useEditorContext } from "@/contexts"
import { CollaboratorInfo } from "@tumaet/apollon"
import Tooltip from "@mui/material/Tooltip"
import { useEffect, useState } from "react"

type CollaboratorPresenceBarProps = {
  isActive: boolean
  onFollowToggle?: (collaborator: CollaboratorInfo) => void
  followedCollaboratorId?: string | null
}

const AVATAR_SIZE = 26
const OVERLAP = -6

const avatarBase: React.CSSProperties = {
  width: AVATAR_SIZE,
  height: AVATAR_SIZE,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontSize: 11,
  fontWeight: 600,
  cursor: "default",
  flexShrink: 0,
}

export const CollaboratorPresenceBar = ({
  isActive,
  onFollowToggle,
  followedCollaboratorId = null,
}: CollaboratorPresenceBarProps) => {
  const { editor } = useEditorContext()
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([])

  useEffect(() => {
    if (!editor || !isActive) {
      setCollaborators([])
      return
    }

    const subscriptionId = editor.subscribeToCollaboratorChanges(
      (collaborators) => {
        setCollaborators(collaborators)
      }
    )

    return () => {
      editor.unsubscribe(subscriptionId)
    }
  }, [editor, isActive])

  const remoteCount = collaborators.filter((c) => !c.isLocal).length
  if (!isActive || remoteCount === 0) return null

  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        display: "flex",
        alignItems: "center",
        zIndex: 10,
        pointerEvents: "auto",
      }}
    >
      {collaborators.map((c, i) => (
        <Tooltip
          key={c.id}
          title={c.isLocal ? `${c.name} (You)` : c.name}
          arrow
          slotProps={{
            popper: {
              modifiers: [{ name: "offset", options: { offset: [0, -4] } }],
            },
          }}
        >
          <div
            aria-label={c.isLocal ? `${c.name} (You)` : c.name}
            role={c.isLocal ? undefined : "button"}
            aria-pressed={
              c.isLocal ? undefined : followedCollaboratorId === c.id
            }
            onClick={() => {
              if (!c.isLocal) {
                onFollowToggle?.(c)
              }
            }}
            style={{
              ...avatarBase,
              backgroundColor: c.color,
              border: "2px solid var(--apollon-background)",
              marginLeft: i === 0 ? 0 : OVERLAP,
              zIndex: collaborators.length - i,
              boxShadow:
                followedCollaboratorId === c.id
                  ? `0 0 0 2px ${c.color}, 0 0 0 5px rgba(0, 0, 0, 0.12)`
                  : undefined,
              cursor: c.isLocal ? "default" : "pointer",
            }}
          >
            {c.name.charAt(0).toUpperCase()}
          </div>
        </Tooltip>
      ))}
    </div>
  )
}
