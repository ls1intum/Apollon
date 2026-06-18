import { withThemeByDataAttribute } from "@storybook/addon-themes"
import type { Decorator, Preview } from "@storybook/react-vite"

// Import BOTH stylesheets: theme.css compiles the inline Tailwind utilities
// (badge, alert, tabs, card, dialog, sheet, select, etc. via @source), while
// components.css carries the compiled @apply rules keyed on
// data-slot/-variant/-size for button, icon-button, input/textarea, tooltip.
// Omitting either leaves a subset of components unstyled.
import "../src/styles/theme.css"
import "../src/styles/components.css"

// Surface decorator: paint the canvas with the design tokens so the dark theme
// is actually visible (the data-theme flip only changes token values).
const withSurface: Decorator = (Story) => (
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
        order: ["Introduction", "Theming", "Tokens", "Components", "*"],
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    withThemeByDataAttribute({
      themes: {
        light: "light",
        dark: "dark",
      },
      defaultTheme: "light",
      attributeName: "data-theme",
    }),
    withSurface,
  ],
}

export default preview
