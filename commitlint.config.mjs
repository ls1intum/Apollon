// @ts-check
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Closed type set. These are the only types a squash-merge subject (the PR
    // title) may use. Each maps to a user-facing release-note category in
    // `scripts/extract-changelog.mjs#TYPE_TO_CATEGORY`; the full mapping table
    // lives in docs/contributor/development/release-notes.md ("How your change
    // gets grouped"). Keep this list in sync with that script's TYPE_TO_CATEGORY
    // (enforced by scripts/check-release-taxonomy.mjs).
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "perf",
        "docs",
        "refactor",
        "build",
        "chore",
        "ci",
        "test",
        "style",
        "revert",
      ],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "library",
        "server",
        "webapp",
        "vscode",
        "vscode-extension",
        "deps",
        "ci",
        "docker",
        "docs",
        "release",
      ],
    ],
  },
}
