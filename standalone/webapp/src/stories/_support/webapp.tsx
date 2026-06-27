/* Shared foundation for the webapp component stories.
 *
 * Most webapp components read one or more of: the TanStack router (the global
 * withTanStackRouter decorator in preview.tsx covers <Link>/useNavigate/
 * useLocation), the EditorContext (live ApollonEditor + diagram name), the
 * ModalContext (openModal/closeModal), and — for modal *bodies* rendered
 * standalone — the ModalProgressContext. The `use*Context` hooks throw without
 * their provider, so any consumer needs the matching decorator.
 *
 * State (theme / persisted diagrams / versions) is held in zustand singletons;
 * seed them in a story's `beforeEach` and reset in the meta's `beforeEach`.
 */
import type { ReactNode } from "react"
import type { Decorator } from "@storybook/react-vite"
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"
import type { ApollonEditor, UMLModel } from "@tumaet/apollon/react"
import { EditorContext, EditorProvider } from "@/contexts/EditorContext"
import { ModalProvider } from "@/contexts/ModalContext"
import { ModalProgressProvider } from "@/contexts/ModalProgressContext"
import { ModalFrame, type ModalVariant } from "@/wrappers/ModalFrame"

/**
 * Mounts a story inside a real TanStack router on in-memory history — the same
 * memory/root-route harness as `src/test/renderWithRouter.tsx` — so components
 * that call `useNavigate`/`useLocation` or render a `<Link>` work without ever
 * touching `window.location`.
 *
 * The active location and the routes the story mounts under are driven per story
 * via the `tanstackRouter` parameter:
 *
 *   parameters: { tanstackRouter: { initialEntry: "/imprint", routePaths: ["/imprint"] } }
 *
 * Defaults to the home route (`/`).
 */
export const withTanStackRouter: Decorator = (Story, context) => {
  const { initialEntry = "/", routePaths = ["/"] } = (context.parameters
    .tanstackRouter ?? {}) as {
    initialEntry?: string
    routePaths?: string[]
  }

  const rootRoute = createRootRoute({ component: () => <Outlet /> })
  const routes = routePaths.map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      validateSearch: (search: Record<string, unknown>) => search,
      component: () => <Story />,
    })
  )
  const router = createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  })

  return <RouterProvider router={router} />
}

/**
 * Editor + Modal context providers — the common decorator for navbar, home, and
 * any component that can open a modal. (ModalProvider also mounts the modal
 * host, so `openModal` works inside a story.) The router is already global.
 */
export const WebappProviders: Decorator = (Story) => (
  <EditorProvider>
    <ModalProvider>
      <Story />
    </ModalProvider>
  </EditorProvider>
)

/**
 * For stories that render a modal *body* directly (not via openModal). Adds the
 * ModalProgressContext those bodies consume on top of the editor/modal context.
 */
export const ModalBodyProviders: Decorator = (Story) => (
  <EditorProvider>
    <ModalProvider>
      <ModalProgressProvider>
        <Story />
      </ModalProgressProvider>
    </ModalProvider>
  </EditorProvider>
)

/**
 * Renders a modal *body* story inside the AUTHENTIC modal chrome — the real
 * {@link ModalFrame} (open Base UI Dialog + accent/divider header + responsive
 * sizing) that `ModalWrapper` uses in the app, so the story looks and is sized
 * exactly like the shipped modal instead of a bare, full-bleed body. Includes
 * the editor/modal/progress providers the bodies consume. Pick the `variant`
 * that matches how the modal is actually opened (New Diagram → `home-wide`,
 * Share → `editor-share`, About/PPTX/version confirms → `plain`, …).
 *
 * The frame portals over a backdrop, so give the story `layout: "fullscreen"`
 * and (for a clean Docs page) `parameters.docs.story.inline: false`.
 */
export function withModalFrame(opts: {
  title: string
  variant: ModalVariant
  contentOverflow?: boolean
}): Decorator {
  return function ModalFrameDecorator(Story) {
    return (
      <EditorProvider>
        <ModalProvider>
          <ModalProgressProvider>
            <ModalFrame
              title={opts.title}
              variant={opts.variant}
              contentOverflow={opts.contentOverflow}
            >
              <Story />
            </ModalFrame>
          </ModalProgressProvider>
        </ModalProvider>
      </EditorProvider>
    )
  }
}

/**
 * Wraps a story on the editor's chrome surface — the SAME surface the navbar
 * islands and version sidebar sit on in production.
 *
 * The navbar islands are THEME-FOLLOWING: they paint `.apollon-glass`
 * (`--apollon-chrome-glass`, derived from `--apollon-background`) and their text
 * uses `--apollon-chrome-text` (`--apollon-primary-contrast`) — both flip with
 * the document theme, so contrast is always correct. An earlier version of this
 * decorator hard-coded a fixed-dark `--navbar-bg` plate; that put the
 * theme-following text on the wrong background (dark-ink-on-dark in light mode),
 * a false color-contrast failure the production navbar never has. We render on
 * the theme-following chrome surface instead so the story reflects real contrast.
 *
 * (The name is kept for its many call sites; the surface is no longer "dark" —
 * it's the themed chrome surface.)
 */
export const DarkNavbarSurface: Decorator = (Story) => (
  <div className="rounded-md bg-[var(--apollon-chrome-surface)] p-4 text-[color:var(--apollon-chrome-text)]">
    <Story />
  </div>
)

/**
 * A throwaway `ApollonEditor` stub for stories that only need a truthy editor in
 * `EditorContext` (the navbar shared-editor affordances read at most
 * `editor.model`). Pass an optional model; the cast keeps callers from having to
 * build a full editor instance.
 */
export function makeStubEditor(model?: Partial<UMLModel>): ApollonEditor {
  return {
    model: {
      version: "4.0.0",
      type: "ClassDiagram",
      title: "Shared",
      nodes: [],
      edges: [],
      ...model,
    },
  } as unknown as ApollonEditor
}

/**
 * Supplies an `EditorContext` (seeded with `editor` + `diagramName`) and a modal
 * host. The navbar's shared-editor affordances (Save-a-local-copy, the mobile
 * overflow tail) only render with a live editor in context, so their stories
 * inject a stub via this provider. `editor` defaults to a minimal stub; pass a
 * real instance to mount against a live editor.
 */
export function StubEditorContext({
  children,
  editor = makeStubEditor(),
  diagramName = "Shared",
}: {
  children: ReactNode
  editor?: ApollonEditor | undefined
  diagramName?: string
}) {
  return (
    <EditorContext.Provider
      value={{
        editor,
        diagramName,
        setDiagramName: () => {},
        setEditor: () => {},
      }}
    >
      <ModalProvider>{children}</ModalProvider>
    </EditorContext.Provider>
  )
}

/**
 * Decorator form of {@link StubEditorContext}: wraps a story in a stub editor +
 * modal host. Use the component form directly when a story needs to control the
 * editor/diagram name or nest extra layout.
 */
export const withStubEditor: Decorator = (Story) => (
  <StubEditorContext>
    <Story />
  </StubEditorContext>
)
