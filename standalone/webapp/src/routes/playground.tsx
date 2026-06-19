import { createFileRoute } from "@tanstack/react-router"
import { ApollonPlayground } from "@/pages/ApollonPlayground"

export const Route = createFileRoute("/playground")({
  component: ApollonPlayground,
})
