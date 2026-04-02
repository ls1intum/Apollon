import { FC } from "react"

type Props = {
  children: React.ReactNode
  fill?: string
  x?: string | number
  y?: string | number
  dominantBaseline?: string
  textAnchor?: string
  fontWeight?: string
  fontFamily?: string
  pointerEvents?: string
  noX?: boolean
  noY?: boolean
}

export const CustomText: FC<Props & Record<string, unknown>> = ({
  children,
  fill = "var(--apollon-primary-contrast)",
  x = "50%",
  y = "50%",
  dominantBaseline = "central",
  textAnchor = "middle",
  fontWeight = "400",
  fontFamily = "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
  pointerEvents = "none",
  noX = false,
  noY = false,
  ...props
}: Props) => {
  const pos: { x?: string | number; y?: string | number } = {}
  if (!noX) {
    pos.x = x
  }
  if (!noY) {
    pos.y = y
  }
  return (
    <text
      {...pos}
      fill={fill}
      dominantBaseline={dominantBaseline}
      textAnchor={textAnchor}
      fontWeight={fontWeight}
      fontFamily={fontFamily}
      pointerEvents={pointerEvents}
      {...props}
    >
      {children}
    </text>
  )
}
