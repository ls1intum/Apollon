---
"@tumaet/webapp": patch
---

No visible change to the editor. Under the hood, the web app's version
history — the list, version snapshots, and saving/renaming/deleting/restoring
versions — now runs through one shared data layer instead of hand-written
fetching, so the version panel refreshes and reconciles more consistently
across tabs and collaborators.
