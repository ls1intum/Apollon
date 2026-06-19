import { SVGAttributes } from "react"

export const KeyboardArrowDownIcon = ({
  width = 24,
  height = 24,
  // Inherit the surrounding text color so the arrow tracks its control: on the
  // navbar buttons it idles in the muted `secondary` grey (the button sets that
  // color) and brightens to white on hover alongside the label, instead of
  // staying a fixed grey. All call sites render inside a colored control.
  fill = "currentColor",
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
