import { SVGAttributes } from "react"
import type { LucideIcon } from "lucide-react"

export type AppIconProps = SVGAttributes<SVGSVGElement>

export function makeIcon(Lucide: LucideIcon, defaultSize = 24) {
  return function AppIcon({ width, height, fill, ...props }: AppIconProps) {
    const size = width ?? height ?? defaultSize
    // Map the callers' `fill` onto lucide's stroke `color`; `fill="none"` keeps
    // its meaning rather than forcing the default tint.
    const color =
      typeof fill === "string" && fill !== "none"
        ? fill
        : "var(--apollon-primary-contrast, #000000)"
    return (
      <Lucide
        width={width ?? size}
        height={height ?? size}
        color={color}
        fill={fill}
        {...props}
      />
    )
  }
}
