import React from "react"

interface DividerLineProps {
  width?: string | number
  height?: string | number
  /** Overrides the default `8px 0` margin (e.g. `0` inside a list). */
  margin?: string | number
  /** Line color; defaults to the themed contrast token via CSS. */
  color?: string
}

// Visual tokens live in app.css ([data-slot="divider-line"], --apollon-*
// fallbacks). Geometry/color overrides are passed as --divider-* custom
// properties only — no inline visual React.CSSProperties.
export const DividerLine: React.FC<DividerLineProps> = ({
  width,
  height,
  margin,
  color,
}) => (
  <div
    data-slot="divider-line"
    style={
      {
        "--divider-width": width,
        "--divider-height": height,
        "--divider-margin": margin,
        "--divider-color": color,
      } as React.CSSProperties
    }
  />
)
