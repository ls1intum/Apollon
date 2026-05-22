import { useEditorContext } from "@/contexts"
import { CollaboratorInfo } from "@tumaet/apollon"
import Tooltip from "@mui/material/Tooltip"
import { useEffect, useState } from "react"

type CollaboratorPresenceBarProps = {
  isActive: boolean
  onFollowToggle?: (collaborator: CollaboratorInfo) => void
  followedCollaboratorId?: string | null
  followedByCount?: number
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
  followedByCount = 0,
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
      {collaborators.map((c, i) => {
        const isFollowing = followedCollaboratorId === c.id
        const isBeingFollowed = c.isLocal && followedByCount > 0
        const followCountLabel =
          followedByCount > 9 ? "9+" : `${followedByCount}`
        const label = c.isLocal
          ? isBeingFollowed
            ? `${c.name} (You, Followed by ${followedByCount})`
            : `${c.name} (You)`
          : isFollowing
            ? `${c.name} (Following)`
            : c.name

        return (
          <Tooltip
            key={c.id}
            title={label}
            arrow
            slotProps={{
              popper: {
                modifiers: [{ name: "offset", options: { offset: [0, -4] } }],
              },
            }}
          >
            <div
              aria-label={label}
              role={c.isLocal ? undefined : "button"}
              aria-pressed={c.isLocal ? undefined : isFollowing}
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
                boxShadow: isFollowing
                  ? `0 0 0 2px ${c.color}, 0 0 0 5px rgba(0, 0, 0, 0.12)`
                  : undefined,
                cursor: c.isLocal ? "default" : "pointer",
                position: "relative",
              }}
            >
              {c.name.charAt(0).toUpperCase()}
              {isFollowing && !c.isLocal && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    bottom: -4,
                    right: -4,
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    backgroundColor: "#111111",
                    color: "#ffffff",
                    fontSize: 8,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid var(--apollon-background)",
                  }}
                >
                  F
                </span>
              )}
              {isBeingFollowed && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    bottom: -4,
                    left: -4,
                    minWidth: 14,
                    height: 14,
                    padding: "0 2px",
                    borderRadius: 10,
                    backgroundColor: "#ffffff",
                    color: "#111111",
                    fontSize: 8,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `2px solid ${c.color}`,
                  }}
                >
                  {followCountLabel}
                </span>
              )}
            </div>
          </Tooltip>
        )
      })}
    </div>
  )
}
