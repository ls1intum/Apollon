import { createFileRoute } from "@tanstack/react-router"
import { HomePage } from "@/pages/HomePage"

// HomePage renders its own HomeNavbar + footer, so the root layout shows
// neither for "/".
export const Route = createFileRoute("/")({
  component: HomePage,
})
