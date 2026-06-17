import { Button } from "@tumaet/ui/components/button"
import { Input } from "@tumaet/ui/components/input"
import { useModalContext } from "@/contexts"
import { useState } from "react"
import type { KeyboardEvent } from "react"

type CollaborateNameModalProps = {
  onConfirm?: (name: string) => void
  initialName?: string
}

export const CollaborateNameModal = ({
  onConfirm,
  initialName,
}: CollaborateNameModalProps) => {
  const { closeModal } = useModalContext()
  const [name, setName] = useState(initialName || "")
  const trimmedName = name.trim()
  const isValid = trimmedName.length > 0

  const handleConfirm = () => {
    if (!isValid) {
      return
    }
    onConfirm?.(trimmedName)
    closeModal()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      handleConfirm()
    }
  }

  return (
    <div className="flex flex-col gap-4 text-[var(--apollon-primary-contrast)]">
      <p className="text-sm">Enter a display name to collaborate.</p>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="collaboration-name"
          className="text-sm text-[var(--apollon-secondary)]"
        >
          Display name
        </label>
        <Input
          autoFocus
          id="collaboration-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Your name"
        />
      </div>
      <Button onClick={handleConfirm} disabled={!isValid}>
        Start Collaborating
      </Button>
    </div>
  )
}
