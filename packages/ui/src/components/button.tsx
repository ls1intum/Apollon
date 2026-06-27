import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

// The visual styling lives in styles/components.css, keyed on
// data-slot="button" + data-variant/-size, so the published, Tailwind-free
// editor library can bundle the compiled CSS and embed anywhere (no inline
// Tailwind utilities to leak into a host). cva here only validates/defaults the
// variant + size and surfaces the VariantProps type.
const buttonVariants = cva("", {
  variants: {
    variant: {
      default: "",
      outline: "",
      secondary: "",
      ghost: "",
      destructive: "",
      link: "",
    },
    size: {
      default: "",
      xs: "",
      sm: "",
      lg: "",
      icon: "",
      "icon-xs": "",
      "icon-sm": "",
      "icon-lg": "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-variant={variant}
      data-size={size}
      className={cn("group/button", className)}
      {...props}
      // data-slot LAST so it survives the `render={<Button/>}` merge (Base UI
      // triggers inject their own data-slot via props; a Button is always a
      // button, and its CSS is keyed on data-slot="button").
      data-slot="button"
    />
  )
}

export { Button, buttonVariants }
