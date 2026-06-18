import type { StorybookConfig } from "@storybook/react-vite"

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/stories/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
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
  // Storybook's Vite builder does NOT run Tailwind on its own, so the
  // inline utilities (theme.css / @source) and the @apply rules
  // (components.css) would never compile and components render unstyled.
  // Wire @tailwindcss/vite in here so both stylesheets are built.
  async viteFinal(viteConfig) {
    const { mergeConfig } = await import("vite")
    const tailwindcss = (await import("@tailwindcss/vite")).default
    return mergeConfig(viteConfig, {
      plugins: [tailwindcss()],
    })
  },
}

export default config
