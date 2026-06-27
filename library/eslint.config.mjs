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
    // eslint-plugin-react-hooks v7 flat preset — bundles the React Compiler
    // lint rules (preserve-manual-memoization, refs, purity, immutability,
    // set-state-in-effect, …). exhaustive-deps stays at warn: the only
    // remaining exhaustive-deps suppression is Apollon.tsx's mount-once lifecycle.
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      "react-hooks/exhaustive-deps": "warn",
      "react/prop-types": "off",
      "no-console": "error",
      // Allow intentionally-unused `_`-prefixed bindings.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // The library is migrated to Base UI + raw CSS + --apollon-* tokens.
      // It must never depend on MUI or a CSS-in-JS runtime (Emotion).
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@mui/*", "@mui"],
              message:
                "MUI is removed from the library. Use Base UI (@base-ui/react) primitives and lucide-react icons instead.",
            },
            {
              group: ["@emotion/*", "@emotion"],
              message:
                "The library styles with raw CSS + --apollon-* tokens, never CSS-in-JS. Do not import Emotion.",
            },
          ],
        },
      ],
    },
  },
  {
    // setState-in-effect is the correct pattern in these files — post-paint SVG
    // geometry measurement, Yjs subscription sync, and bounded prop→state sync —
    // so it is warn here while staying an error everywhere else.
    files: [
      "lib/components/collaboration/**/*.tsx",
      "lib/components/popovers/**/*EditPopover.tsx",
      "lib/edges/GenericEdge.tsx",
      "lib/hooks/useRemoteDraggingNodes.ts",
      "lib/hooks/useStraightPathEdge.ts",
    ],
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
]
