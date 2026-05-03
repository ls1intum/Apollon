import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import Button from "@mui/material/Button"
import { Typography } from "@/components/Typography"
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
    <Box sx={{ gap: 2, display: "flex", flexDirection: "column" }}>
      <Typography variant="body2">
        Enter a display name to collaborate.
      </Typography>
      <TextField
        autoFocus
        fullWidth
        id="collaboration-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Your name"
        variant="outlined"
        sx={{
          input: {
            color: "var(--apollon-primary-contrast)",
          },
        }}
      />
      <Button variant="contained" onClick={handleConfirm} disabled={!isValid}>
        Start Collaborating
      </Button>
    </Box>
  )
}
