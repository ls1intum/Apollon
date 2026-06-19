---
"@tumaet/server": minor
"@tumaet/webapp": minor
---

Embed shared diagrams anywhere. A new server-rendered SVG endpoint (`GET /api/diagrams/:id/preview.svg`) lets you drop a live diagram straight into a GitHub or GitLab README, issue, or PR as a Markdown image — it renders inline through their image proxy and stays in sync as you edit. A companion `/embed/:id` page serves a lightweight, iframe-friendly view (with an "Open in Apollon" link) for Notion, Confluence, GitLab Pages, and VS Code previews. The share dialog gains an "Embed in GitHub / GitLab" panel with ready-to-copy Markdown and iframe snippets. Both surfaces reuse the diagram URL as the access key — no new tokens or sign-in — and are cacheable (ETag + conditional requests) so repeated views are cheap.
