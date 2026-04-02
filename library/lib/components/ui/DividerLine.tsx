import React from "react"

interface DividerLineProps {
  width?: string | number
  height?: string | number
  style?: React.CSSProperties
  backgroundColor?: string
}

export const DividerLine: React.FC<DividerLineProps> = ({
  width = "100%",
  height = "1px",
  style,
  backgroundColor = "var(--apollon-primary-contrast)",
}) => (
  <div
    style={{
      width: width,
      height: height,
      backgroundColor: backgroundColor,
      margin: "8px 0",
      ...style,
    }}
  />
)
