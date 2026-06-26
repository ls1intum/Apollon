import { useReactiveEdge, useReactiveNodeName } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps, MessageData } from "@/edges/EdgeProps"
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react"
import { PopoverProps } from "../types"
import { useState, useEffect } from "react"
import { generateUUID } from "@/utils"
import { IconButton, TextField } from "@/components/ui"
import { EdgeStyleEditor } from "@/components/styleEditor"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"
import { log } from "../../../logger"

export const CommunicationDiagramEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { setEdges, updateEdgeData } = useReactFlow()
  const edge = useReactiveEdge(elementId)
  const [messages, setMessages] = useState<MessageData[]>([])
  const [newLabelInput, setNewLabelInput] = useState("")
  const [duplicateError, setDuplicateError] = useState(false)

  const sourceName = useReactiveNodeName(edge?.source, "Source")
  const targetName = useReactiveNodeName(edge?.target, "Target")

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
                  <ArrowRight width={16} height={16} aria-hidden="true" />
                ) : (
                  <ArrowLeft width={16} height={16} aria-hidden="true" />
                )}
              </IconButton>

              {/* Message Text Field */}
              <TextField
                value={message.text}
                onChange={(e) => handleMessageTextUpdate(index, e.target.value)}
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
                <Trash2 width={16} height={16} aria-hidden="true" />
              </IconButton>
            </div>
          )
        })}

        {/* Add new message input */}
        <div className="apollon-add-row">
          <TextField
            value={newLabelInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            fullWidth
            placeholder="Message"
            error={duplicateError}
            helperText={duplicateError ? "This message already exists" : ""}
          />
          <IconButton
            ariaLabel="Add message"
            tooltip="Add message"
            onClick={handleAddMessage}
          >
            <Plus width={16} height={16} aria-hidden="true" />
          </IconButton>
        </div>
      </PopoverSection>
    </PopoverLayout>
  )
}
