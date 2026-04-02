import { Box, IconButton } from "@mui/material"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps, MessageData } from "@/edges/EdgeProps"
import { ArrowBackIcon, ArrowForwardIcon, DeleteIcon } from "@/components/Icon"
import { PopoverProps } from "../types"
import { useState, useEffect } from "react"
import { generateUUID } from "@/utils"
import { EdgeStyleEditor, TextField } from "@/components/ui"
import { log } from "../../../logger"

export const CommunicationDiagramEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { getEdge, setEdges, getNode, updateEdgeData } = useReactFlow()
  const edge = getEdge(elementId)
  const [messages, setMessages] = useState<MessageData[]>([])
  const [newLabelInput, setNewLabelInput] = useState("")
  const [duplicateError, setDuplicateError] = useState(false)

  const sourceNode = getNode(edge?.source || "")
  const targetNode = getNode(edge?.target || "")
  const sourceName = (sourceNode?.data?.name as string) ?? "Source"
  const targetName = (targetNode?.data?.name as string) ?? "Target"

  useEffect(() => {
    if (edge?.data) {
      const edgeData = edge.data as CustomEdgeProps
      if (edgeData.messages) {
        setMessages(edgeData.messages)
      }
    }
  }, [edge])

  const handleMessagesChange = (newMessages: MessageData[]) => {
    setMessages(newMessages)
    if (edge) {
      const labels = newMessages.map((msg) => msg.text)
      setEdges((edges) =>
        edges.map((e) =>
          e.id === elementId
            ? {
                ...e,
                data: {
                  ...e.data,
                  messages: newMessages,
                  labels: labels,
                },
              }
            : e
        )
      )
    }
  }

  const handleAddMessage = () => {
    if (newLabelInput.trim()) {
      const trimmedInput = newLabelInput.trim()
      const messageExists = messages.some(
        (msg) => msg.text.toLowerCase() === trimmedInput.toLowerCase()
      )

      if (messageExists) {
        setDuplicateError(true)
        log.warn(`Message "${trimmedInput}" already exists`)
        return
      }

      setDuplicateError(false)

      const newMessage: MessageData = {
        id: generateUUID(),
        text: trimmedInput,
        direction: "target",
      }
      const newMessages = [...messages, newMessage]
      handleMessagesChange(newMessages)
      setNewLabelInput("")
    }
  }

  const handleInputChange = (value: string) => {
    setNewLabelInput(value)
    if (duplicateError) {
      const trimmedValue = value.trim()
      const wouldBeDuplicate =
        trimmedValue &&
        messages.some(
          (msg) => msg.text.toLowerCase() === trimmedValue.toLowerCase()
        )
      if (!wouldBeDuplicate) {
        setDuplicateError(false)
      }
    }
  }

  const handleDeleteMessage = (index: number) => {
    const newMessages = messages.filter((_, i) => i !== index)
    handleMessagesChange(newMessages)
  }

  const handleMessageTextUpdate = (index: number, value: string) => {
    const newMessages = [...messages]
    newMessages[index] = { ...newMessages[index], text: value }
    handleMessagesChange(newMessages)
  }

  const handleMessageDirectionToggle = (index: number) => {
    const newMessages = [...messages]
    newMessages[index] = {
      ...newMessages[index],
      direction:
        newMessages[index].direction === "target" ? "source" : "target",
    }
    handleMessagesChange(newMessages)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddMessage()
    }
  }

  if (!edge) {
    return null
  }
  const edgeData = edge.data as CustomEdgeProps | undefined

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <EdgeStyleEditor
        edgeData={edgeData}
        handleDataFieldUpdate={(key, value) =>
          updateEdgeData(elementId, { ...edge.data, [key]: value })
        }
        label="Communication Link"
      />

      {messages.map((message, index) => {
        const isDuplicateText = messages.some(
          (msg, i) =>
            i !== index &&
            msg.text.toLowerCase() === message.text.toLowerCase() &&
            message.text.trim() !== ""
        )

        return (
          <Box
            key={index}
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            {/* Direction Toggle Button */}
            <IconButton
              size="small"
              onClick={() => handleMessageDirectionToggle(index)}
              color={message.direction === "target" ? "primary" : "secondary"}
              title={`Direction: ${
                message.direction === "target"
                  ? `${sourceName} → ${targetName}`
                  : `${targetName} → ${sourceName}`
              }`}
            >
              {message.direction === "target" ? (
                <ArrowForwardIcon
                  fontSize="small"
                  fill="var(--apollon-primary-contrast)"
                />
              ) : (
                <ArrowBackIcon
                  fontSize="small"
                  fill="var(--apollon-primary-contrast)"
                />
              )}
            </IconButton>

            {/* Message Text Field */}
            <TextField
              value={message.text}
              onChange={(e) => handleMessageTextUpdate(index, e.target.value)}
              size="small"
              fullWidth
              placeholder={`Message ${index + 1}`}
              error={isDuplicateText}
              helperText={isDuplicateText ? "Duplicate message" : ""}
            />

            {/* Delete Button */}
            <DeleteIcon
              width={16}
              height={16}
              style={{ cursor: "pointer" }}
              onClick={() => handleDeleteMessage(index)}
            />
          </Box>
        )
      })}

      {/* Add new message input */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <TextField
          value={newLabelInput}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          size="small"
          fullWidth
          placeholder="+ Add Message"
          error={duplicateError}
          helperText={duplicateError ? "This message already exists" : ""}
        />
      </Box>
    </Box>
  )
}
