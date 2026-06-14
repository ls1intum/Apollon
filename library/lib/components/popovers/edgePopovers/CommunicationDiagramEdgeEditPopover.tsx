import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps, MessageData } from "@/edges/EdgeProps"
import { ArrowBackIcon, ArrowForwardIcon, DeleteIcon } from "@/components/Icon"
import { PopoverProps } from "../types"
import { useState, useEffect } from "react"
import { generateUUID } from "@/utils"
import { EdgeStyleEditor, IconButton, TextField } from "@/components/ui"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"
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

  const getMessageLabel = (message: MessageData, index: number) => {
    const trimmedText = message.text.trim()

    return trimmedText || `message ${index + 1}`
  }

  if (!edge) {
    return null
  }
  const edgeData = edge.data as CustomEdgeProps | undefined

  return (
    <PopoverLayout title="Edge">
      <EdgeStyleEditor
        edgeData={edgeData}
        handleDataFieldUpdate={(key, value) =>
          updateEdgeData(elementId, { ...edge.data, [key]: value })
        }
        label="Style"
      />

      <PopoverSection title="Messages" divider>
        {messages.map((message, index) => {
          const isDuplicateText = messages.some(
            (msg, i) =>
              i !== index &&
              msg.text.toLowerCase() === message.text.toLowerCase() &&
              message.text.trim() !== ""
          )
          const directionText =
            message.direction === "target"
              ? `${sourceName} → ${targetName}`
              : `${targetName} → ${sourceName}`
          const messageLabel = getMessageLabel(message, index)

          return (
            <div
              key={index}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              {/* Direction Toggle Button */}
              <IconButton
                ariaLabel={`Switch direction for ${messageLabel}: ${directionText}`}
                tooltip={`Switch direction: ${directionText}`}
                onClick={() => handleMessageDirectionToggle(index)}
              >
                {message.direction === "target" ? (
                  <ArrowForwardIcon
                    width={16}
                    height={16}
                    fill="var(--apollon-primary-contrast, #000000)"
                  />
                ) : (
                  <ArrowBackIcon
                    width={16}
                    height={16}
                    fill="var(--apollon-primary-contrast, #000000)"
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
              <IconButton
                ariaLabel={`Delete ${messageLabel}`}
                tooltip={`Delete ${messageLabel}`}
                onClick={() => handleDeleteMessage(index)}
              >
                <DeleteIcon
                  width={16}
                  height={16}
                  fill="var(--apollon-primary-contrast, #000000)"
                  aria-hidden="true"
                />
              </IconButton>
            </div>
          )
        })}

        {/* Add new message input */}
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
      </PopoverSection>
    </PopoverLayout>
  )
}
