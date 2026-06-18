import { withThemeByDataAttribute } from "@storybook/addon-themes"
import type { Decorator, Preview } from "@storybook/react-vite"
import { withRouter } from "storybook-addon-remix-react-router"

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

const preview: Preview = {
  parameters: {
    layout: "centered",
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
          "Introduction",
          "Theming",
          "Tokens",
          "Components",
          "Editor",
          ["Diagrams", "Elements", "Chrome"],
          "Webapp",
          ["Navbar", "Home", "Modals", "Versioning", "Pages"],
          "*",
        ],
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    // Router context so any component using <Link>/useNavigate renders without
    // crashing. Per-story routes are set via the reactRouter parameter.
    withRouter,
    withThemeByDataAttribute({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
      attributeName: "data-theme",
    }),
    withSurface,
  ],
}

export default preview
