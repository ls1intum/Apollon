---
"@tumaet/webapp": patch
---

No visible change to the editor. Under the hood, the web app now loads and caches version history, version snapshots, and shared diagrams through one shared data layer instead of hand-written fetching, so the version panel refreshes and reconciles more consistently across tabs and collaborators.
