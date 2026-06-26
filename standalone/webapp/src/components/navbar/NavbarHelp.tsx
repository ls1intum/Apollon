import { FC } from "react"
import { HomeHelpMenu } from "@/components/home/HomeHelpMenu"

interface NavbarHelpProps {
  /** Pins an explicit foreground on the themed mobile overflow menu. */
  color?: string
}

/**
 * The editor's Help dropdown is the SHARED {@link HomeHelpMenu} in its `editor`
 * variant — so the editor and the home Help controls are byte-identical in
 * trigger composition, surface, item set/order, and a11y, with the editor-only
 * "How does this Editor Work?" / "Open Playground" entries layered onto the same
 * shared body. There is exactly one Help/legal source in the app.
 */
export const NavbarHelp: FC<NavbarHelpProps> = ({ color }) => (
  <HomeHelpMenu variant="editor" color={color} />
)
