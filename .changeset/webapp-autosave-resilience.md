---
"@tumaet/webapp": patch
---

Fixes the standalone editor sometimes losing your most recent change when you navigate away or when a save didn't reach the server. Your latest edit is now saved reliably on the way out, a save is never reported as successful unless it actually persisted, and an edit made while you are previewing an earlier version is saved once you return.
