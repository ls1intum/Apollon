// @ts-check
import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["**/dist/**", "**/*.d.ts", "**/node_modules/**"],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      curly: "warn",
      eqeqeq: "warn",
      "no-throw-literal": "warn",
    },
  },
  // `@tumaet/apollon/export` also exports the PDF renderer, whose dependencies
  // weigh ~860 kB. `pngRenderer.ts` narrows it to the one binding this webview
  // needs so the rest can be tree-shaken; importing it anywhere else undoes that.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/pngRenderer.ts"],
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
]
