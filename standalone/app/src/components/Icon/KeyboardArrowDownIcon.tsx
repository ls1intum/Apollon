import { SVGAttributes } from "react"

export const KeyboardArrowDownIcon = ({
  width = 24,
  height = 24,
  fill = "#A3A6A8",
  ...props
}: SVGAttributes<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    fill={fill}
    viewBox="0 -960 960 960"
    {...props}
  >
    <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z" />
  </svg>
)
