// @ts-check
import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import reactPlugin from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      // Capacitor native projects (contain generated/bundled web assets)
      "ios/**",
      "android/**",
    ],
  },
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
      // Match library config: exhaustive-deps as warning (legitimate
      // stale-closure patterns exist in the webapp's editor handlers).
      "react-hooks/exhaustive-deps": "warn",
      "react/prop-types": "off",
    },
  },
]
