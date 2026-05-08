import { useEditorContext } from "@/contexts"
import { CollaboratorInfo } from "@tumaet/apollon"
import Tooltip from "@mui/material/Tooltip"
import { useEffect, useState } from "react"

type CollaboratorPresenceBarProps = {
  isActive: boolean
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
            style={{
              ...avatarBase,
              backgroundColor: c.color,
              border: "2px solid var(--apollon-background)",
              marginLeft: i === 0 ? 0 : OVERLAP,
              zIndex: collaborators.length - i,
            }}
          >
            {c.name.charAt(0).toUpperCase()}
          </div>
        </Tooltip>
      ))}
    </div>
  )
}
