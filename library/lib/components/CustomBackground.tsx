import { Background, BackgroundVariant } from "@xyflow/react"

export const CustomBackground = () => {
  return (
    <>
      <Background
        id="1"
        gap={10}
        color="var(--apollon-gray, #e9ecef)"
        variant={BackgroundVariant.Lines}
      />

      <Background
        id="2"
        gap={50}
        color="var(--apollon-grid, rgba(36, 39, 36, 0.1))"
        variant={BackgroundVariant.Lines}
      />
    </>
  )
}
