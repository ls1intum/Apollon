import { useEffect, useRef, useState } from "react"

export type HomeAnchor = "new" | "template" | "recent"

export const useHomeScrollSpy = () => {
  const [activeAnchor, setActiveAnchor] = useState<HomeAnchor>("new")
  const [isReady, setIsReady] = useState(false)
  const activeAnchorRef = useRef<HomeAnchor>("new")

  const contentRef = useRef<HTMLElement>(null)
  const newDiagramRef = useRef<HTMLElement>(null)
  const templateRef = useRef<HTMLElement>(null)
  const recentRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const scrollContainer = contentRef.current
    if (!scrollContainer) return

    let animationFrameId: number | null = null

    const updateAnchorByScroll = () => {
      const entries = [
        { anchor: "new" as HomeAnchor, element: newDiagramRef.current },
        { anchor: "template" as HomeAnchor, element: templateRef.current },
        { anchor: "recent" as HomeAnchor, element: recentRef.current },
      ].filter(
        (entry): entry is { anchor: HomeAnchor; element: HTMLElement } =>
          entry.element !== null
      )

      const sectionRects = entries
        .map((entry) => ({
          anchor: entry.anchor,
          top: entry.element.getBoundingClientRect().top,
        }))
        .sort((a, b) => a.top - b.top)

      const threshold = scrollContainer.getBoundingClientRect().height * 0.42
      const matched = sectionRects.find(
        (entry) => entry.top >= 0 && entry.top <= threshold
      )

      if (matched && matched.anchor !== activeAnchorRef.current) {
        activeAnchorRef.current = matched.anchor
        setActiveAnchor(matched.anchor)
      }
    }

    const scheduleUpdate = () => {
      if (animationFrameId !== null) {
        return
      }
      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null
        updateAnchorByScroll()
      })
    }

    updateAnchorByScroll()
    scrollContainer.addEventListener("scroll", scheduleUpdate, {
      passive: true,
    })
    window.addEventListener("resize", scheduleUpdate, { passive: true })

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId)
      }
      scrollContainer.removeEventListener("scroll", scheduleUpdate)
      window.removeEventListener("resize", scheduleUpdate)
    }
  }, [])

  const scrollToAnchor = (anchor: HomeAnchor) => {
    activeAnchorRef.current = anchor
    setActiveAnchor(anchor)
    const target =
      anchor === "recent"
        ? recentRef.current
        : anchor === "template"
          ? templateRef.current
          : newDiagramRef.current
    if (!target) return
    target.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const sectionRefs = { contentRef, newDiagramRef, templateRef, recentRef }

  return { activeAnchor, isReady, sectionRefs, scrollToAnchor }
}
