import { FC, ReactNode, SVGProps } from "react"
import { FONT_FAMILY } from "@/fontStack"

type Props = Omit<SVGProps<SVGTextElement>, "x" | "y"> & {
  children: ReactNode
  x?: string | number
  y?: string | number
  noX?: boolean
  noY?: boolean
}

export const CustomText: FC<Props> = ({
  children,
  fill = "var(--apollon-primary-contrast, #000000)",
  x = "50%",
  y = "50%",
  dominantBaseline = "central",
  textAnchor = "middle",
  fontWeight = "400",
  fontFamily = FONT_FAMILY,
  pointerEvents = "none",
  noX = false,
  noY = false,
  ...props
}) => {
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
