// @ts-check
import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import eslintReact from "@eslint-react/eslint-plugin"
import reactHooks from "eslint-plugin-react-hooks"

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ["node_modules", "dist"] },
  { files: ["**/*.{js,ts,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  // recommended-typescript disables the prop-types rules TypeScript already enforces.
  eslintReact.configs["recommended-typescript"],
  {
    plugins: { "react-hooks": reactHooks },
    // eslint-plugin-react-hooks is the hooks / React-Compiler authority here
    // (preserve-manual-memoization, refs, purity, immutability,
    // set-state-in-effect, …). @eslint-react ships its own copies of those hook
    // rules in `recommended-typescript`; turn them off so each concern is
    // reported once, by react-hooks. exhaustive-deps stays at warn: the only
    // remaining exhaustive-deps suppression is Apollon.tsx's mount-once lifecycle.
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
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
      "no-console": "error",
      // Allow intentionally-unused `_`-prefixed bindings.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // The library styles with Base UI + raw CSS + --apollon-* tokens.
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
