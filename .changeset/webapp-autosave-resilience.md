---
"@tumaet/webapp": patch
---

fix: persist the most recent edit when a tab closes or navigates away

Autosave is now change-debounced with a max-wait cap and flushes on teardown,
replacing the fixed-interval poll, so the latest edit is saved on tab close or
navigation instead of being dropped.
