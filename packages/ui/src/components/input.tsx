import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "../lib/utils"

// Styling lives in styles/components.css, keyed on data-slot="input" (see
// button.tsx for the why — embed-safe, Tailwind-free library bundle).
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(className)}
      {...props}
    />
  )
}

export { Input }
