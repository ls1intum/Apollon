import type { StorybookConfig } from "@storybook/react-vite"

// Single-host Storybook for the whole monorepo. It lives in the webapp because
// the webapp sits at the top of the dependency graph (it already depends on
// @tumaet/ui and @tumaet/apollon), so hosting here avoids a dependency cycle —
// and the webapp's vite.config.ts already resolves all three packages from
// source (the `@`/`@tumaet/*` aliases + the apollon-alias-resolver plugin +
// Tailwind). @storybook/react-vite auto-merges that vite.config, so stories
// from every package resolve and style correctly with no extra wiring.
const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: [
    // Design system (@tumaet/ui) — primitives + token/theming docs.
    "../../../packages/ui/src/stories/**/*.mdx",
    "../../../packages/ui/src/**/*.stories.@(ts|tsx)",
    // Editor library (@tumaet/apollon) — diagrams, element renderers, chrome.
    "../../../library/lib/**/*.stories.@(ts|tsx)",
    "../../../library/lib/**/*.mdx",
    // Webapp — navbar, home, modals, versioning, pages.
    "../src/**/*.mdx",
    "../src/**/*.stories.@(ts|tsx)",
  ],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
    "@storybook/addon-vitest",
  ],
  core: {
    disableTelemetry: true,
  },
  typescript: {
    reactDocgen: "react-docgen-typescript",
  },
}

export default config
