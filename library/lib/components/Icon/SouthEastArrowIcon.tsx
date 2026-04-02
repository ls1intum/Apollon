import { SVGAttributes } from "react"

type Props = SVGAttributes<SVGSVGElement>

export const SouthEastArrowIcon = ({
  width = 24,
  height = 24,
  fill = "var(--apollon-primary-contrast, #e3e3e3)",
  ...props
}: Props) => (
  <svg
    width={width}
    height={height}
    fill={fill}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 -960 960 960"
    {...props}
  >
    <path d="M360-200v-80h264L160-744l56-56 464 464v-264h80v400H360Z" />
  </svg>
)
