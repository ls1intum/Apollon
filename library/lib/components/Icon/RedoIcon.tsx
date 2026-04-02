import { SVGAttributes } from "react"

export const RedoIcon = ({
  width = 16,
  height = 16,
  fill = "var(--apollon-primary-contrast, #e3e3e3)",
  ...props
}: SVGAttributes<SVGSVGElement>) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    fill={fill}
    {...props}
  >
    <path d="M16,6,10,0V3.6S-1.08,2.86,1.59,13.78a.27.27,0,0,0,.53,0c.35-2,1.9-6,7.88-5.77v4Z" />
  </svg>
)
