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
    // Webapp — navbar, home, modals, versioning, pages, AND the editor stories
    // (which live under src/stories/editor and drive @tumaet/apollon).
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
    // Stories span three packages (@tumaet/ui, @tumaet/apollon, webapp), each in
    // its own tsconfig project. react-docgen-typescript reads a single TS project
    // and warns + skips prop tables for everything outside it (the @tumaet/ui
    // primitives never got tables). react-docgen (babel AST) is project-agnostic:
    // it generates prop tables for components in EVERY package with no warnings.
    reactDocgen: "react-docgen",
  },
}

export default config
