// @ts-check
import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import reactPlugin from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ["node_modules", "dist"] },
  { files: ["**/*.{js,ts,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat["jsx-runtime"],
  {
    settings: { react: { version: "detect" } },
    plugins: { "react-hooks": reactHooks },
    // rules-of-hooks at error (the pre-existing violations in
    // lib/nodes/sfcDiagram/* were latent crashes — hooks called after an
    // early return — and are now fixed). exhaustive-deps stays at warn
    // because ~15 hooks have legitimate deliberate-stale-closure patterns
    // (e.g. imperative editor lifecycle keyed on a single boolean).
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/exhaustive-deps": "warn",
      "react/prop-types": "off",
      "no-console": "error",
    },
  },
]
