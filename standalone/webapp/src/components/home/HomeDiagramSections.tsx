import {
  lazy,
  Suspense,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react"
import { DiagramTypeGrid } from "@/components/home/DiagramTypeGrid"

const DiagramGallery = lazy(() =>
  import("@/components/home/DiagramGallery").then((module) => ({
    default: module.DiagramGallery,
  }))
)

type HomeDiagramSectionsProps = {
  appearClass: string
  newDiagramRef: RefObject<HTMLElement>
  recentRef: RefObject<HTMLElement>
  newDiagramIcon: ReactElement
  recentIcon: ReactElement
  children: ReactNode
}

const LoadingPanel = () => (
  <div
    className="flex min-h-48 items-center justify-center rounded-lg border border-[var(--home-border-color)] bg-[var(--home-bg-card)] text-[var(--home-text-secondary)] transition-colors duration-200"
    role="status"
    aria-live="polite"
  >
    <div className="flex items-center gap-3 text-sm font-medium">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--home-border-color)] border-t-[var(--home-accent-color)]" />
      Loading diagrams...
    </div>
  </div>
)

export const HomeDiagramSections = ({
  appearClass,
  newDiagramRef,
  recentRef,
  newDiagramIcon,
  recentIcon,
  children,
}: HomeDiagramSectionsProps) => {
  return (
    <>
      <section
        id="new-diagram-section"
        ref={newDiagramRef}
        className={`mt-6 scroll-mt-28 space-y-4 transition-[opacity,transform] duration-700 ${appearClass}`}
        style={{ transitionDelay: "130ms" }}
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--home-text-secondary)]">
          <span className="text-[var(--home-accent-color)]">
            {newDiagramIcon}
          </span>
          Start Here
        </div>
        <h2 className="text-xl font-semibold">1. Create New Diagram</h2>
        <DiagramTypeGrid />
      </section>

      {children}

      <section
        ref={recentRef}
        className={`mt-10 scroll-mt-28 space-y-4 transition-[opacity,transform] duration-700 ${appearClass}`}
        style={{ transitionDelay: "210ms" }}
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--home-text-secondary)]">
          <span className="text-[var(--home-accent-color)]">{recentIcon}</span>
          Continue Momentum
        </div>
        <h2 className="text-xl font-semibold">3. Continue Recent Work</h2>
        <Suspense fallback={<LoadingPanel />}>
          <DiagramGallery />
        </Suspense>
      </section>
    </>
  )
}
