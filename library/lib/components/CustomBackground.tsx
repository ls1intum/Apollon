import { Background, BackgroundVariant } from "@xyflow/react"

export const CustomBackground = () => {
  return (
    <>
      <Background
        id="1"
        gap={10}
        color="var(--apollon-gray)"
        variant={BackgroundVariant.Lines}
      />

      <Background
        id="2"
        gap={50}
        color="var(--apollon-grid)"
        variant={BackgroundVariant.Lines}
      />
    </>
  )
}
