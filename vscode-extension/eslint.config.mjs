// @ts-check
import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["**/dist/**", "**/out/**", "**/*.d.ts", "**/node_modules/**"],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  // Extension host (Node, CJS-compiled-from-TS)
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      curly: "warn",
      eqeqeq: "warn",
      "no-throw-literal": "warn",
    },
  },
  // Webviews (browser, React)
  {
    files: ["editor/src/**/*.{ts,tsx}", "menu/src/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      curly: "warn",
      eqeqeq: "warn",
      "no-throw-literal": "warn",
    },
  },
]
