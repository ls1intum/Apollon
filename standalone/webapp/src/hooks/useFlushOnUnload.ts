import { useEffect, useRef } from "react"
import type { UMLModel } from "@tumaet/apollon"
import { serverURL } from "@/constants"

interface Options {
  diagramId: string | undefined
  getModel: () => UMLModel | undefined
  isDirty: () => boolean
}

/**
 * Best-effort flush of the current canvas to the server when the tab is
 * about to close. Uses `fetch(..., { keepalive: true })` so the request
 * survives the navigation. Errors are dropped — the user is leaving and
 * there's no UI to surface them on.
 *
 * The accessor functions are stored in a ref so callers can pass fresh
 * closures every render without re-attaching the `pagehide` listener.
 */
export function useFlushOnUnload(opts: Options) {
  const optsRef = useRef(opts)
  // Latest-closure ref: keeps the pagehide listener stable while callers pass
  // fresh closures each render. Read only inside the effect's handler, never
  // during render.
  // eslint-disable-next-line react-hooks/refs
  optsRef.current = opts

  useEffect(() => {
    const handler = () => {
      const { diagramId, getModel, isDirty } = optsRef.current
      if (!diagramId || !isDirty()) return
      const model = getModel()
      if (!model) return
      void fetch(`${serverURL}/api/diagrams/${diagramId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(model),
        keepalive: true,
        credentials: "include",
      })
    }
    window.addEventListener("pagehide", handler)
    return () => window.removeEventListener("pagehide", handler)
  }, [])
}
