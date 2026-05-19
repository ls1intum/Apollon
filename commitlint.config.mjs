export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "library",
        "server",
        "app",
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
