import { Button } from "@tumaet/ui/components/button"
import { DialogFooter } from "@tumaet/ui/components/dialog"
import { Input } from "@tumaet/ui/components/input"
import { useState } from "react"
import type { KeyboardEvent } from "react"

type CollaborateNameModalProps = {
  /** Called with the trimmed display name when the user confirms. */
  onConfirm: (name: string) => void
  /** Called after a successful confirm so the host can dismiss the modal. */
  onClose: () => void
  /** Seeds the input; the field stays uncontrolled afterwards. */
  initialName?: string
}

export const CollaborateNameModal = ({
  onConfirm,
  onClose,
  initialName,
}: CollaborateNameModalProps) => {
  const [name, setName] = useState(initialName || "")
  const trimmedName = name.trim()
  const isValid = trimmedName.length > 0

  const handleConfirm = () => {
    if (!isValid) {
      return
    }
    onConfirm(trimmedName)
    onClose()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      handleConfirm()
    }
  }

  return (
    <div className="flex flex-col gap-4 text-foreground">
      <p className="text-sm">Enter a display name to collaborate.</p>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="collaboration-name"
          className="text-sm text-muted-foreground"
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
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="default" onClick={handleConfirm} disabled={!isValid}>
          Start Collaborating
        </Button>
      </DialogFooter>
    </div>
  )
}
