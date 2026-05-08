import { useEditorContext } from "@/contexts"
import { useEffect, useState, type RefObject } from "react"

type CollaboratorCursor = {
  clientId: number
  name: string
  color: string
  x: number
  y: number
}

type CollaboratorCursorsProps = {
  containerRef: RefObject<HTMLDivElement>
  isActive: boolean
}

export const CollaboratorCursors = ({
  containerRef,
  isActive,
}: CollaboratorCursorsProps) => {
  const { editor } = useEditorContext()
  const [collaborators, setCollaborators] = useState<CollaboratorCursor[]>([])
  const [, reproject] = useState(0)

  useEffect(() => {
    if (!editor || !isActive) {
      setCollaborators([])
      return
    }

    const subscriptionId = editor.subscribeToAwarenessChanges((states) => {
      const localClientId = editor.getLocalAwarenessClientId()
      const next = Array.from(states.entries()).flatMap(([clientId, state]) => {
        if (clientId === localClientId) {
          return []
        }

        const cursor = state?.cursor
        const user = state?.user
        if (!cursor || !user) {
          return []
        }

        return [
          {
            clientId,
            name: user.name,
            color: user.color,
            x: cursor.x,
            y: cursor.y,
          },
        ]
      })

      setCollaborators(next)
    })

    return () => {
      editor.unsubscribe(subscriptionId)
    }
  }, [editor, isActive])

  useEffect(() => {
    if (!editor || !isActive || collaborators.length === 0) return
    const id = setInterval(() => {
      reproject((v) => (v + 1) % 100_000)
    }, 100)
    return () => clearInterval(id)
  }, [editor, isActive, collaborators.length])

  if (!isActive || !containerRef.current || !editor) {
    return null
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      {collaborators.map((collaborator) => {
        const screenPosition = editor.flowToScreenPosition({
          x: collaborator.x,
          y: collaborator.y,
        })
        if (!screenPosition) {
          return null
        }
        return (
          <div
            key={collaborator.clientId}
            style={{
              position: "absolute",
              left: screenPosition.x,
              top: screenPosition.y,
              transform: "translate(8px, 8px)",
            }}
          >
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              style={{ display: "block" }}
            >
              <path
                d="M2 1L2 18L6.5 13.8L9.5 19L12 17.7L9 12.6L15 12.2L2 1Z"
                fill={collaborator.color}
                stroke="#ffffff"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            <div
              style={{
                marginTop: 4,
                padding: "2px 6px",
                fontSize: 12,
                borderRadius: 6,
                color: "#ffffff",
                backgroundColor: collaborator.color,
                whiteSpace: "nowrap",
              }}
            >
              {collaborator.name}
            </div>
          </div>
        )
      })}
    </div>
  )
}
