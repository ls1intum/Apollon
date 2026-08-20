import { FC, ReactNode, SVGProps } from "react"
import { FONT_FAMILY } from "@/fontStack"

type Props = Omit<SVGProps<SVGTextElement>, "x" | "y"> & {
  children: ReactNode
  x?: string | number
  y?: string | number
  noX?: boolean
  noY?: boolean
}

/**
 * `central` centres on the em box; `middle` centres on the x-height, which sits
 * roughly half a cap-height lower — so passing a true centre (`height / 2`, a row
 * centre) to `middle` renders the text visibly high.
 *
 * Do not override with `middle`, and do not reach for `alignment-baseline`: that
 * property applies to inline content inside a `<text>`, not to the `<text>`
 * element itself, so it is silently ignored here and the label falls back to the
 * alphabetic baseline.
 *
 * WebKit resolves `dominant-baseline` per positioning run, so any tspan carrying
 * its own `x`/`y`/`dy` must repeat it or it falls back to alphabetic there while
 * Blink inherits.
 */
export const CustomText: FC<Props> = ({
  children,
  fill = "var(--apollon-foreground, #000000)",
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
