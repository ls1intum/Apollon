import { SVGAttributes } from "react"

type Props = SVGAttributes<SVGSVGElement>

export const SwapHorizIcon = ({
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
    <path d="M280-160 80-360l200-200 56 57-103 103h287v80H233l103 103-56 57Zm400-240-56-57 103-103H440v-80h287L624-743l56-57 200 200-200 200Z" />
  </svg>
)
