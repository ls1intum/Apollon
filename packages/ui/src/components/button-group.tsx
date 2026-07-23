import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

const buttonGroupVariants = cva("", {
  variants: {
    orientation: {
      horizontal: "",
      vertical: "",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
})

function ButtonGroup({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  )
}

export { ButtonGroup, buttonGroupVariants }
