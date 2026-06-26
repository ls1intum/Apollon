import React from "react"
import { Button as SharedButton } from "@tumaet/ui/components/button"

// The editor's Button IS the shared @tumaet/ui Button, with two editor defaults:
//   • variant="outline" — the editor's resting button look (the shared default is
//     the filled "default"); most editor buttons sit on glass/popover surfaces.
//   • type="button" — these render inside popovers and inline forms, where an
//     accidental implicit submit would be a real bug.
// The full shadcn variant/size vocabulary passes straight through; styling ships
// in the bundled, Tailwind-free components.css (data-slot="button").
export type ButtonProps = React.ComponentProps<typeof SharedButton>

export const Button: React.FC<ButtonProps> = ({
  variant = "outline",
  type = "button",
  ...props
}) => <SharedButton variant={variant} type={type} {...props} />
