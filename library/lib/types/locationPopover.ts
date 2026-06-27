// Popover anchor corner; `GenericPopover` maps it to Base UI `side`/`align`.
export type PopoverOrigin = {
  vertical: "top" | "center" | "bottom"
  horizontal: "left" | "center" | "right"
}

export type LocationPopover = {
  transformOrigin: PopoverOrigin
}
