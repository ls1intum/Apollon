// @ts-check
import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import reactPlugin from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ["node_modules", "dist", "storybook-static"] },
  { files: ["**/*.{js,ts,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat["jsx-runtime"],
  {
    settings: { react: { version: "detect" } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/exhaustive-deps": "warn",
      "react/prop-types": "off",
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
