# Changelog

All notable changes to the Apollon VS Code extension are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this extension adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

GitHub Releases at <https://github.com/ls1intum/Apollon/releases> (tag prefix `apollon-vscode@*`) carry the full per-release notes; this file summarises user-visible changes.

## [Unreleased]

`1.0.0` is pending, and will be the first release cut by the `Release VS Code Extension`
workflow. It is not the extension's first Marketplace listing: `tumaet.apollon-vscode`
has been published since 2024-11-18, last at `0.0.17`.

Upgrading from `0.0.17` leaves one trace behind. That version wrote
`"files.associations": { "*.apollon": "json" }` into global user settings on every
activation. Nothing writes it now, and nothing removes it either — `.apollon` files still
open in the Apollon editor, but reopening one as text shows it as JSON rather than under
this extension's own `apollon` language and file icon. Deleting that line from settings
restores both.

[Unreleased]: https://github.com/ls1intum/Apollon/compare/main...HEAD
