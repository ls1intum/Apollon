// @ts-check
import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import eslintReact from "@eslint-react/eslint-plugin"
import reactHooks from "eslint-plugin-react-hooks"

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ["node_modules", "dist", "storybook-static"] },
  { files: ["**/*.{js,ts,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  // recommended-typescript disables the prop-types rules TypeScript already enforces.
  eslintReact.configs["recommended-typescript"],
  {
    plugins: { "react-hooks": reactHooks },
    // eslint-plugin-react-hooks is the hooks / React-Compiler authority here;
    // turn off @eslint-react's overlapping hook-rule copies so each concern is
    // reported once, by react-hooks.
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@eslint-react/error-boundaries": "off",
      "@eslint-react/exhaustive-deps": "off",
      "@eslint-react/purity": "off",
      "@eslint-react/rules-of-hooks": "off",
      "@eslint-react/set-state-in-effect": "off",
      "@eslint-react/set-state-in-render": "off",
      "@eslint-react/static-components": "off",
      "@eslint-react/unsupported-syntax": "off",
      "@eslint-react/use-memo": "off",
      "react-hooks/exhaustive-deps": "warn",
      // Allow intentionally-unused `_`-prefixed bindings.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // The shared component library is built on Base UI + Tailwind tokens.
      // It must never depend on MUI or a CSS-in-JS runtime (Emotion).
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@mui/*", "@mui"],
              message:
                "MUI is removed. Use Base UI (@base-ui/react) primitives and lucide-react icons instead.",
            },
            {
              group: ["@emotion/*", "@emotion"],
              message:
                "Components style with Tailwind + tokens, never CSS-in-JS. Do not import Emotion.",
            },
          ],
        },
      ],
    },
  },
]
