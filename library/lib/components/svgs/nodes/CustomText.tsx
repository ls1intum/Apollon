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
 * Every label in the diagram goes through here, so the baseline default is the
 * one thing worth being deliberate about.
 *
 * `central` centres on the em box; `middle` centres on the x-height, which sits
 * roughly half a cap-height lower. Passing a true centre (`height / 2`, a row
 * centre, a computed group centre) to `middle` therefore renders the text about
 * 0.1em high — enough to read as "not quite centred" on a node title, and it was
 * doing exactly that on titles, stereotypes, headers and row labels alike.
 *
 * Do not override this with `middle`, and do not reach for `alignment-baseline`:
 * that property applies to inline content inside a `<text>`, not to the `<text>`
 * element itself, so on a `<text>` it is ignored and the label silently falls
 * back to the alphabetic baseline.
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
