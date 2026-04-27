import { SVGAttributes } from "react"

type Props = SVGAttributes<SVGSVGElement>

export const DragHandleIcon = ({
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
    viewBox="0 0 24 24"
    {...props}
  >
    <circle cx="8.5" cy="7" r="1.5" />
    <circle cx="15.5" cy="7" r="1.5" />
    <circle cx="8.5" cy="12" r="1.5" />
    <circle cx="15.5" cy="12" r="1.5" />
    <circle cx="8.5" cy="17" r="1.5" />
    <circle cx="15.5" cy="17" r="1.5" />
  </svg>
)
