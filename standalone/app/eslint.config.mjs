import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import reactPlugin from "eslint-plugin-react"

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["node_modules", "dist"],
  },
  {
    files: ["**/*.{js,ts,tsx}"],
  },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat["jsx-runtime"], // Add this if you are using React 17+
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
]
