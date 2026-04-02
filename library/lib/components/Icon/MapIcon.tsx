import { SVGAttributes } from "react"

type Props = SVGAttributes<SVGSVGElement>

export const MapIcon = ({
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
    <path d="m600-120-240-84-186 72q-20 8-37-4.5T120-170v-560q0-13 7.5-23t20.5-15l212-72 240 84 186-72q20-8 37 4.5t17 33.5v560q0 13-7.5 23T812-192l-212 72Zm-40-98v-468l-160-56v468l160 56Z" />
  </svg>
)
