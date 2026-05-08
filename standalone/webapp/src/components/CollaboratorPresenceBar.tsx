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

  const totalCount = collaborators.length + 1

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        display: "flex",
        alignItems: "center",
        gap: 8,
        zIndex: 10,
        pointerEvents: "auto",
        backgroundColor: "var(--apollon-background)",
        borderRadius: 20,
        padding: "6px 12px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "var(--apollon-secondary)",
          whiteSpace: "nowrap",
        }}
      >
        {totalCount} online
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        <Tooltip title={`${localUser.name} (You)`} arrow>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: localUser.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              border: "2px solid var(--apollon-background)",
              outline: "2px solid var(--apollon-secondary)",
              cursor: "default",
              flexShrink: 0,
            }}
          >
            {localUser.name.charAt(0).toUpperCase()}
          </div>
        </Tooltip>
        {collaborators.map((c) => (
          <Tooltip key={c.clientId} title={c.name} arrow>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: c.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                border: "2px solid var(--apollon-background)",
                cursor: "default",
                flexShrink: 0,
              }}
            >
              {c.name.charAt(0).toUpperCase()}
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}
