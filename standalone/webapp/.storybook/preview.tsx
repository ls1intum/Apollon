import { useEffect, useState, type ComponentProps } from "react"
import { withThemeByDataAttribute } from "@storybook/addon-themes"
import type { Decorator, Preview } from "@storybook/react-vite"
import { DocsContainer } from "@storybook/addon-docs/blocks"
import { themes } from "storybook/theming"
import { addons } from "storybook/preview-api"
import { withTanStackRouter } from "../src/stories/_support/webapp"
import { QueryClientProvider } from "@tanstack/react-query"
import { storybookQueryClient } from "../src/stories/_support/queryClient"
import { VersionRepositoryProvider } from "../src/contexts/VersionRepositoryContext"

type DocsContainerCtx = ComponentProps<typeof DocsContainer>["context"]

// One CSS entry chain for every package's stories:
//  - webapp.css pulls in @tumaet/ui's theme.css (Tailwind + all --apollon-*/
//    --home-* tokens via @theme/@source) and the precompiled, Preflight-free
//    components.css (data-slot primitives), plus webapp chrome.
//  - the editor library is Tailwind-free and ships its own app.css; import it
//    (and ReactFlow's stylesheet) so the diagram/element stories render with
//    the real editor look.
//  - preview.css is imported LAST so its app-shell reset wins over webapp.css.
import "../src/webapp.css"
import "@xyflow/react/dist/style.css"
import "../../../library/lib/styles/app.css"
import "../../../library/lib/styles/alignmentGuides.css"
import "./preview.css"

// The themed page background + text colour come from ONE place: webapp.css paints
// `html`/`body` with `--apollon-background` / `--apollon-foreground`, which
// flip with the root `data-theme` the toolbar sets — so every story (fullscreen
// or not) sits on the correct surface with no extra wiring. This decorator only
// adds breathing room around centered/padded component stories; fullscreen
// stories (editor canvas, modals) manage their own full-bleed layout.
const withPadding: Decorator = (Story, context) =>
  context.parameters.layout === "fullscreen" ? (
    <Story />
  ) : (
    <div style={{ padding: "2rem" }}>
      <Story />
    </div>
  )

/**
 * autodocs pages render the story previews via the data-theme decorator (so they
 * flip with the toolbar), but the surrounding Docs CHROME — page background,
 * prose, the args table — is themed by Storybook's own static docs theme, which
 * ignores `data-theme`. That left dark previews on a light docs page (and in
 * spots dark-on-dark, unreadable).
 *
 * This container keeps the Storybook docs theme in lock-step with the ACTUAL
 * applied theme by observing `html[data-theme]` — the single source of truth the
 * data-theme decorator writes. Reading a global at mount is racy (the decorator
 * sets the attribute when the first preview renders, which can be AFTER this
 * container mounts, and `globalsUpdated` only fires on a *change*) — that race is
 * exactly why a freshly-loaded docs page sometimes stayed light. The
 * MutationObserver catches the attribute whenever it lands; the globals channel
 * covers toolbar toggles before any preview has re-rendered.
 */
const htmlThemeIsDark = (): boolean =>
  typeof document !== "undefined" &&
  document.documentElement.getAttribute("data-theme") === "dark"

const readInitialIsDark = (context: DocsContainerCtx): boolean => {
  const globals = (
    context as { store?: { userGlobals?: { globals?: { theme?: string } } } }
  )?.store?.userGlobals?.globals
  if (globals?.theme) return globals.theme === "dark"
  return htmlThemeIsDark()
}

const ThemedDocsContainer = ({
  context,
  children,
}: ComponentProps<typeof DocsContainer>) => {
  const [isDark, setIsDark] = useState(() => readInitialIsDark(context))
  useEffect(() => {
    // Sync from the DOM attribute, but ignore a transient unset (null) so we
    // never clobber a correct initial read before the decorator has written it.
    const syncFromDom = () => {
      const attr = document.documentElement.getAttribute("data-theme")
      if (attr === "dark" || attr === "light") setIsDark(attr === "dark")
    }
    syncFromDom()
    const observer = new MutationObserver(syncFromDom)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })
    const channel = addons.getChannel()
    const onGlobals = ({ globals }: { globals?: { theme?: string } }) => {
      if (globals?.theme) setIsDark(globals.theme === "dark")
    }
    channel.on("globalsUpdated", onGlobals)
    return () => {
      observer.disconnect()
      channel.off("globalsUpdated", onGlobals)
    }
  }, [])

  // `inline: false` stories (modals, editors) render in nested story iframes.
  // Storybook does NOT pass the theme global to those iframe URLs, and the
  // globals channel never reaches them — so their data-theme decorator defaults
  // to light and never updates, leaving the preview light inside a dark docs
  // page. The container knows the real theme, so push it into each child iframe
  // and enforce it: the nested decorator sets light once on mount, so an observer
  // on the iframe's <html> re-applies the correct theme the instant it diverges.
  useEffect(() => {
    const theme = isDark ? "dark" : "light"
    const observers = new Set<MutationObserver>()
    const enforce = (doc: Document) => {
      if (doc.documentElement.getAttribute("data-theme") !== theme)
        doc.documentElement.setAttribute("data-theme", theme)
    }
    const attach = (frame: HTMLIFrameElement) => {
      let doc: Document | null = null
      try {
        doc = frame.contentDocument
      } catch {
        return
      }
      if (!doc) return
      enforce(doc)
      const mo = new MutationObserver(() => doc && enforce(doc))
      mo.observe(doc.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      })
      observers.add(mo)
    }
    const scan = () =>
      document.querySelectorAll("iframe").forEach((f) => attach(f))
    scan()
    // story iframes lazy-load on scroll — catch each as it finishes loading,
    // and any iframe added to the docs DOM later.
    const onLoad = (e: Event) => {
      if (e.target instanceof HTMLIFrameElement) attach(e.target)
    }
    document.addEventListener("load", onLoad, true)
    const domObserver = new MutationObserver(scan)
    domObserver.observe(document.body, { childList: true, subtree: true })
    return () => {
      document.removeEventListener("load", onLoad, true)
      domObserver.disconnect()
      observers.forEach((o) => o.disconnect())
    }
  }, [isDark])

  return (
    <DocsContainer
      context={context}
      theme={isDark ? themes.dark : themes.light}
    >
      {children}
    </DocsContainer>
  )
}

const preview: Preview = {
  parameters: {
    layout: "centered",
    docs: { container: ThemedDocsContainer },
    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'error' fails the suite on any a11y violation (axe-core) so they can't
      // silently accumulate. Scope a narrow per-story disable (with a reason)
      // for justified false positives — never reintroduce a global off-switch.
      test: "error",
      // Exclude Base UI's focus-guard sentinels from the scan. Base UI traps Tab
      // focus inside an open overlay (menu/dialog/tooltip) with two
      // `<span data-base-ui-focus-guard tabindex="0" aria-hidden="true">`
      // sentinels. That `tabindex=0` + `aria-hidden` combination is INTENTIONAL
      // framework markup, but axe's `aria-hidden-focus` rule flags it — and the
      // sentinels live on `document.body` (the overlay portals there), so an
      // overlay one story leaves open leaks into the NEXT story's body-wide scan,
      // producing a non-deterministic `aria-hidden-focus` failure on innocent
      // stories. These nodes are never author content and nothing we author can
      // fix them, so they are excluded globally rather than chased per story.
      context: { exclude: ["[data-base-ui-focus-guard]"] },
    },
    options: {
      storySort: {
        order: [
          "UI",
          ["Overview", "Theming", "Tokens", "Components"],
          // Editor is grouped BY DIAGRAM TYPE — each type colocates all its parts
          // (Diagram, Palette, Elements, Edges, popovers). Within a type, stories
          // keep file order (Diagram first). Type order follows the palette.
          "Editor",
          [
            "Introduction",
            "Class Diagram",
            "Object Diagram",
            "Activity Diagram",
            "Use Case Diagram",
            "Communication Diagram",
            "Component Diagram",
            "Deployment Diagram",
            "Petri Net",
            "Reachability Graph",
            "Syntax Tree",
            "Flowchart",
            "BPMN",
            "SFC",
          ],
          "Webapp",
          ["Navbar", "Home", "Modals", "Versioning", "Pages", "Misc"],
          "*",
        ],
      },
    },
  },
  tags: ["autodocs"],
  // One clean query cache per story: stories that share a query key but inject
  // different data would otherwise read each other's cached results.
  beforeEach: () => {
    storybookQueryClient.clear()
  },
  decorators: [
    // TanStack Query context for components that read server state through
    // the query hooks (versioning UI, share flow, legal pages). The shared
    // client lives in _support/queryClient so beforeEach hooks can reset it.
    // Query cache + the version backend the story's UI talks to (the editor
    // routes supply the latter in production).
    (Story) => (
      <QueryClientProvider client={storybookQueryClient}>
        <VersionRepositoryProvider kind="remote">
          <Story />
        </VersionRepositoryProvider>
      </QueryClientProvider>
    ),
    // TanStack router context so any component using <Link>/useNavigate/
    // useLocation renders without crashing. Per-story routes and the active
    // location are set via the `tanstackRouter` parameter.
    withTanStackRouter,
    withThemeByDataAttribute({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
      attributeName: "data-theme",
    }),
    withPadding,
  ],
}

export default preview
