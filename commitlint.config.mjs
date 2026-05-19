export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
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
