import { useEffect } from "react"

const BASE_TITLE = "Apollon"

/**
 * Sets the browser tab title to "<name> – Apollon" (or just "Apollon" when no
 * name is given), and restores the base title on unmount. Lets opened diagrams
 * — including ones opened in a new tab via cmd/ctrl-click — be told apart.
 */
export function useDocumentTitle(name?: string | null) {
  useEffect(() => {
    const trimmed = name?.trim()
    document.title = trimmed ? `${trimmed} – ${BASE_TITLE}` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [name])
}
