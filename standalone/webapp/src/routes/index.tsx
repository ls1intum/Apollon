import { createFileRoute } from "@tanstack/react-router"
import { HomePage } from "@/pages/HomePage"

// The router plugin auto-code-splits this component, replacing the manual
// lazy() wrapper the old App.tsx used. HomePage renders its own HomeNavbar +
// footer, so the root layout shows neither for "/".
export const Route = createFileRoute("/")({
  component: HomePage,
})
