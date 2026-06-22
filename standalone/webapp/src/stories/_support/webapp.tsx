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
 * Wraps a story on the dark navbar surface. The navbar and the version sidebar
 * paint on a fixed dark panel (the `--navbar-bg` token, the canonical name for
 * what was also hard-coded as `NAVBAR_BACKGROUND_COLOR` / `#1f2123` / `#212529`
 * across stories). Use this for any component whose real backdrop is that dark
 * chrome — navbar buttons, version rows — so its light-on-dark styling shows.
 */
export const DarkNavbarSurface: Decorator = (Story) => (
  <div className="rounded-md bg-[var(--navbar-bg)] p-4 text-white">
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
