---
"@tumaet/webapp": patch
---

fix: persist the most recent edit on navigation instead of dropping it

Autosave is now change-debounced with a max-wait cap and flushes on teardown,
replacing the fixed-interval poll, so the latest edit is saved when navigating
away (SPA teardown) instead of being dropped. Tab-close persistence continues
to be handled by the existing pagehide handler.
