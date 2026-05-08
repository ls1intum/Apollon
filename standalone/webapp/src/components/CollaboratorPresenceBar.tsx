import { useEditorContext } from "@/contexts"
import { CollaborationState } from "@tumaet/apollon"
import Tooltip from "@mui/material/Tooltip"
import { useEffect, useState } from "react"

type Collaborator = {
  clientId: number
  name: string
  color: string
}

type CollaboratorPresenceBarProps = {
  isActive: boolean
  localUser: { name: string; color: string } | null
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
  localUser,
}: CollaboratorPresenceBarProps) => {
  const { editor } = useEditorContext()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])

  useEffect(() => {
    if (!editor || !isActive) {
      setCollaborators([])
      return
    }

    const subscriptionId = editor.subscribeToAwarenessChanges((states) => {
      const localClientId = editor.getLocalAwarenessClientId()
      const next: Collaborator[] = []

      for (const [clientId, state] of states.entries()) {
        if (clientId === localClientId) continue
        const typedState = state as CollaborationState
        const user = typedState?.user
        if (!user) continue
        next.push({ clientId, name: user.name, color: user.color })
      }

      setCollaborators(next)
    })

    return () => {
      editor.unsubscribe(subscriptionId)
    }
  }, [editor, isActive])

  if (!isActive || !localUser) return null

  const all = [
    {
      clientId: -1,
      name: localUser.name,
      color: localUser.color,
      isLocal: true,
    },
    ...collaborators.map((c) => ({ ...c, isLocal: false })),
  ]

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
      {all.map((c, i) => (
        <Tooltip
          key={c.clientId}
          title={c.isLocal ? `${c.name} (You)` : c.name}
          arrow
        >
          <div
            style={{
              ...avatarBase,
              backgroundColor: c.color,
              border: "2px solid var(--apollon-background)",
              marginLeft: i === 0 ? 0 : OVERLAP,
              zIndex: all.length - i,
            }}
          >
            {c.name.charAt(0).toUpperCase()}
          </div>
        </Tooltip>
      ))}
    </div>
  )
}
