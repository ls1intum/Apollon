// @ts-check
import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"

/** @type {import('eslint').Linter.RulesRecord} */
const shared = {
  curly: "warn",
  eqeqeq: "warn",
  "no-throw-literal": "warn",
}

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
    rules: shared,
  },
  // Webview (browser, React)
  {
    files: ["webview/src/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.flat.recommended.rules, ...shared },
  },
  // `@tumaet/apollon/export` also exports the PDF renderer, whose dependencies
  // weigh ~860 kB. `pngRenderer.ts` narrows it to the one binding the webview
  // needs so the rest can be tree-shaken; importing it anywhere else undoes that.
  {
    files: ["webview/src/**/*.{ts,tsx}"],
    ignores: ["webview/src/pngRenderer.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@tumaet/apollon/export",
              message: "Import the renderer you need from `./pngRenderer`.",
            },
          ],
        },
      ],
    },
  },
  // The host↔webview contract. Both sides import it, and only one of them has
  // a `vscode` module to import.
  {
    files: ["src/shared/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "vscode",
              message:
                "`src/shared` is bundled into the webview, where `vscode` does not resolve.",
            },
          ],
        },
      ],
    },
  },
]
