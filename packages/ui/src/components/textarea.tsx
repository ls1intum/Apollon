import * as React from "react"

import { cn } from "../lib/utils"

// Styling lives in styles/components.css, keyed on data-slot="textarea" (see
// button.tsx for the why — embed-safe, Tailwind-free library bundle).
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(className)} {...props} />
}

export { Textarea }
