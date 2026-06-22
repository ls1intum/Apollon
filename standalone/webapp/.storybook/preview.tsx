import { useEffect, useState, type ComponentProps } from "react"
import { withThemeByDataAttribute } from "@storybook/addon-themes"
import type { Decorator, Preview } from "@storybook/react-vite"
import { DocsContainer } from "@storybook/addon-docs/blocks"
import { themes } from "storybook/theming"
import { addons } from "storybook/preview-api"
import { withTanStackRouter } from "../src/stories/_support/webapp"

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

// Paint the canvas with the design tokens so the dark theme is actually visible
// (the data-theme flip only changes token values, not element backgrounds).
const withSurface: Decorator = (Story, context) => {
  // Editor/fullscreen stories manage their own sized container; don't wrap them
  // in the padded surface (it would offset the canvas).
  if (context.parameters.layout === "fullscreen") return <Story />
  return (
    <div
      style={{
        backgroundColor: "var(--home-surface-base)",
        color: "var(--home-text-primary)",
        padding: "2rem",
      }}
    >
      <Story />
    </div>
  )
}

/**
 * autodocs pages render the story previews via the data-theme decorator (so they
 * flip with the toolbar), but the surrounding Docs CHROME — page background,
 * prose, the args table — is themed by Storybook's own static docs theme, which
 * ignores `data-theme`. That left dark previews on a light docs page (and in
 * spots dark-on-dark, unreadable). This container syncs the Storybook docs theme
 * to the same `theme` global the toolbar drives: initial value from the docs
 * context, live updates via the globals channel.
 */
const readThemeIsDark = (context: DocsContainerCtx): boolean => {
  const globals = (
    context as { store?: { userGlobals?: { globals?: { theme?: string } } } }
  )?.store?.userGlobals?.globals
  if (globals?.theme) return globals.theme === "dark"
  if (typeof document !== "undefined")
    return document.documentElement.getAttribute("data-theme") === "dark"
  return false
}

const ThemedDocsContainer = ({
  context,
  children,
}: ComponentProps<typeof DocsContainer>) => {
  const [isDark, setIsDark] = useState(() => readThemeIsDark(context))
  useEffect(() => {
    const channel = addons.getChannel()
    const onGlobals = ({ globals }: { globals?: { theme?: string } }) => {
      if (globals?.theme) setIsDark(globals.theme === "dark")
    }
    channel.on("globalsUpdated", onGlobals)
    return () => channel.off("globalsUpdated", onGlobals)
  }, [])
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
      // 'todo' surfaces a11y violations in the test UI without failing CI.
      test: "todo",
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
  decorators: [
    // TanStack router context so any component using <Link>/useNavigate/
    // useLocation renders without crashing. Per-story routes and the active
    // location are set via the `tanstackRouter` parameter.
    withTanStackRouter,
    withThemeByDataAttribute({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
      attributeName: "data-theme",
    }),
    withSurface,
  ],
}

export default preview
