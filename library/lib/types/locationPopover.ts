// Local replacement for MUI's `PopoverOrigin`; `GenericPopover` maps it to
// Radix `side`/`align`.
export type PopoverOrigin = {
  vertical: "top" | "center" | "bottom"
  horizontal: "left" | "center" | "right"
}

export type LocationPopover = {
  anchorOrigin: PopoverOrigin
  transformOrigin: PopoverOrigin
}
