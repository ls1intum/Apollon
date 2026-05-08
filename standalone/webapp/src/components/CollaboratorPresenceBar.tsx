import { useEditorContext } from "@/contexts"
import { CollaborationState } from "@tumaet/apollon"
import { useEffect, useState } from "react"

type Collaborator = {
  clientId: number
  name: string
  color: string
}

type CollaboratorPresenceBarProps = {
  isActive: boolean
}

export const CollaboratorPresenceBar = ({
  isActive,
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

  if (!isActive || collaborators.length === 0) return null

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        display: "flex",
        alignItems: "center",
        gap: 6,
        zIndex: 10,
        pointerEvents: "auto",
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "var(--apollon-secondary)",
          marginRight: 2,
        }}
      >
        {collaborators.length} online
      </span>
      {collaborators.map((c) => (
        <div
          key={c.clientId}
          title={c.name}
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
      ))}
    </div>
  )
}
