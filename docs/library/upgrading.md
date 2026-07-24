---
id: upgrading
title: Upgrading
description: Migrate to the single fully-external @tumaet/apollon entry — one import, required React/xyflow peers, React 19, and the "use client" boundary.
---

# Upgrading

`@tumaet/apollon` collapses the three former build variants — the
default-inlined `@tumaet/apollon`, `@tumaet/apollon/react`, and
`@tumaet/apollon/external` — into **one** entry that externalizes every runtime
dependency. The `<Apollon>` component, hooks, and provider now ship from that
main entry, and `react` / `react-dom` / `@xyflow/react` become **required**
peers (joining `yjs` / `y-protocols`).

## Who's affected

- **You imported from `@tumaet/apollon/react` or `@tumaet/apollon/external`** —
  those subpaths are removed; move to the main entry.
- **You relied on the old inlined default build** — React, xyflow, and the CRDT
  packages are now external peers you must install.
- **You import Apollon helpers into a React Server Component** — the main entry
  is now `"use client"`; see [`"use client"` / RSC](#use-client--rsc).
- **Not affected:** `@tumaet/apollon/internals` and `@tumaet/apollon/export` are
  unchanged.

## Import mapping

| Before                                  | After                                                                |
| --------------------------------------- | -------------------------------------------------------------------- |
| `@tumaet/apollon/external`              | `@tumaet/apollon` (same `ApollonEditor` API — drop the subpath)      |
| `@tumaet/apollon/react`                 | `@tumaet/apollon` (component, hooks, provider on the main entry)     |
| `@tumaet/apollon` (old inlined default) | `@tumaet/apollon` + [install the peers](#install-the-required-peers) |
| `@tumaet/apollon/internals`             | `@tumaet/apollon/internals` (unchanged)                              |
| `@tumaet/apollon/export`                | `@tumaet/apollon/export` (unchanged)                                 |

```ts no-check
// Before
import { ApollonEditor } from "@tumaet/apollon/external"
import { Apollon, useApollonEditor } from "@tumaet/apollon/react"

// After — one entry
import { ApollonEditor, Apollon, useApollonEditor } from "@tumaet/apollon"
```

## Install the required peers

`react`, `react-dom`, and `@xyflow/react` were optional before and are now
required peers. Install them alongside the package:

```sh
npm install @tumaet/apollon \
  react react-dom \
  @xyflow/react \
  yjs y-protocols
```

npm 7+, pnpm 8+, and Bun auto-install missing peers; **Yarn users must add them
explicitly**. See [Install](/library/embedding/install) for why they're external.

## React 19 is required

The peer range for `react` and `react-dom` is now `^19.0.0`. Upgrade your host
to React 19 before upgrading Apollon — on React 18 the install fails with an
`ERESOLVE` peer error.

## `"use client"` / RSC

The main entry is now a client module (`"use client"`) in its entirety. React
Server Components must therefore treat `@tumaet/apollon` as client-only and
import it from client components, not Server Components.

Model migration is also available from the DOM-free
`@tumaet/apollon/model` entry. Server code that only needs to normalize a
diagram can import `importDiagram` from that subpath without loading the
editor. See [SSR](/library/embedding/react#ssr-nextjs-remix-nuxt-sveltekit).

## Removed deep imports (CDN caveat)

The `exports` map no longer has `./react` or `./external` keys — they are
removed, not deprecated. A deep import of `@tumaet/apollon/external` (including
via a CDN such as esm.sh) now **fails to resolve**. Point every reference at the
bare `@tumaet/apollon` specifier instead.
