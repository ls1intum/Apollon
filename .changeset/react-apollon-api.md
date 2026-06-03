---
"@tumaet/apollon": minor
---

New React API for embedding the editor: an `<Apollon>` component with `ApollonProvider`, `useApollonEditor`, `useApollonEditorOrThrow`, and `useApollonSubscription`. A `/react` subpath externalises React, MUI, and emotion so React hosts can dedupe them, while the default entry still bundles them for non-React hosts.
