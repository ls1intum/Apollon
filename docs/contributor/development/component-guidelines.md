---
id: component-guidelines
title: Component design principles
description: The engineering standard for component API design across the Apollon monorepo — presentational, prop-driven, A+ APIs.
---

# Component Design Principles

> The engineering standard for component API design across the Apollon monorepo:
> the Tailwind-free editor library `@tumaet/apollon`, the shadcn/Base-UI design
> system `@tumaet/ui`, and the React-Router/zustand webapp `@tumaet/webapp`.
>
> **Target:** React 19 + TypeScript. **North star:** presentational, excellent
> component APIs across the board — a component reads like its props, stories
> trivially, and survives refactors without churning its public surface.

This is an opinionated standard, not a survey. Each principle has a **Rule**
(one line), a **Why**, and a tiny **good vs bad** example. The
[decision checklist](#decision-checklist) at the end is what you run on every
component you build or refactor.

Conventions referenced throughout reflect the repo's actual setup: Base UI
primitives (`@base-ui/react`), `class-variance-authority` (cva) for variants,
the shadcn `cn` helper (`clsx` + `tailwind-merge`), `data-slot`/`data-*`-keyed
styling, and Storybook 10 + Vitest. The library/webapp **styling boundary**
(raw CSS + `--apollon-*` vars in the library, Tailwind only in the webapp; see
`AGENTS.md`) is a hard constraint, not a preference.

---

## 0. The one rule everything else serves

> **A component's props are its public API. Design them deliberately, keep them
> small and honest, and change them as carefully as you'd change a published
> function signature.**

Everything below is a corollary.

---

## Part 1 — Presentational vs Container separation

The classic Dan Abramov container/presentational split is **still valuable in
2025, but its mechanism changed**: hooks replaced the container _component_ with
a container _hook_. Don't add a wrapper component whose only job is to fetch and
pass props down; put that logic in a custom hook and keep the tree shallow. The
_separation of concerns_ survives; the _extra component layer_ does not. The
pattern is "a guidepost, not a guardrail."
([All Insight Lab](https://allinsightlab.com/container-vs-presentational-components-still-relevant-in-2025/),
[falldowngoboone](https://www.falldowngoboone.com/blog/container-component-pattern-using-context-and-hooks/),
[kentcdodds/ama#545](https://github.com/kentcdodds/ama/issues/545))

### 1.1 Default leaf components to pure-presentational

**Rule:** A leaf/UI component takes data via props and reports events via
callbacks — no store, no fetch, no router inside it.

**Why:** Pure components are referentially transparent: same props → same UI.
They story trivially in Storybook, test as pure functions ("inputs in,
predictable output out"), and are reusable across contexts that wire different
behavior. ([Storybook CDD](https://storybook.js.org/tutorials/intro-to-storybook/react/en/simple-component/))

```tsx
// GOOD — pure: props in, callbacks out. Reusable, storyable, trivially tested.
function DiagramCard({ title, lastEditedAt, onOpen }: DiagramCardProps) {
  return (
    <button data-slot="diagram-card" onClick={onOpen}>
      <span>{title}</span>
      <time>{formatRelative(lastEditedAt)}</time>
    </button>
  )
}

// BAD — leaf reaches into global state + routing + fetch. Untestable in isolation,
// needs a full app (or heavy mocks) to render a single story.
function DiagramCard({ id }: { id: string }) {
  const diagram = useDiagramStore((s) => s.byId[id]) // store coupling
  const navigate = useNavigate() // router coupling
  useEffect(() => {
    fetchDiagramMeta(id)
  }, [id]) // side effect
  return <button onClick={() => navigate(`/d/${id}`)}>{diagram.title}</button>
}
```

### 1.2 Push data, state, and effects up into a thin container hook

**Rule:** Wire stores/router/queries in a `useXxx` hook or a thin container
component at the route/feature boundary; pass plain data and callbacks down.

**Why:** Keeps logic colocated and testable while the tree stays shallow — you
get the separation without the wrapper-component tax. Colocation also makes the
app faster and more maintainable. ([egghead — lifting & colocating state](https://egghead.io/lessons/react-lifting-and-colocating-react-state))

```tsx
// GOOD — container hook owns the wiring; the view is pure.
function useDiagramCard(id: string) {
  const diagram = useDiagramStore((s) => s.byId[id])
  const navigate = useNavigate()
  return {
    title: diagram.title,
    lastEditedAt: diagram.updatedAt,
    onOpen: () => navigate(`/d/${id}`),
  }
}

function DiagramCardContainer({ id }: { id: string }) {
  return <DiagramCard {...useDiagramCard(id)} />
}
```

### 1.3 Decision rule: when may a component read context/store directly?

**Rule:** Read context/store directly **only** when _all three_ hold; otherwise
take props:

1. The data is genuinely **ambient** (theme, current user, locale, the
   open/closed state of an enclosing compound component) — not domain data the
   parent already has.
2. Threading it as props would cross **3+ intermediate layers** that don't use
   it, _and_ extracting components + passing JSX as `children` doesn't remove the
   drilling.
3. The component is **not** intended to be reused outside that provider.

**Why:** React's own docs say start with props, then try extracting components
and passing JSX as `children`, and reach for context only for data needed by
_distant, mutually-independent_ components. Context hides dependencies and
reduces reusability, so it's a deliberate trade, not a default.
([react.dev — Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context))

```tsx
// GOOD — ambient theme via context (criterion 1+2+3 all hold).
function Spinner() {
  const { density } = useUITheme()
  return <span data-slot="spinner" data-density={density} />
}

// BAD — domain data the parent already has, yanked from a store to "save typing".
// Now <PriceTag> only works inside a CartProvider and can't be reused or storied.
function PriceTag() {
  const total = useCartStore((s) => s.total) // should have been a `value` prop
  return <span>{formatMoney(total)}</span>
}
```

**Note for `@tumaet/ui`:** design-system primitives are _consumed_ across apps,
so criterion 3 almost never holds — UI-package components take props. The one
sanctioned exception is **compound-component internal context** (Principle 3.2),
which is private wiring, not application state.

---

## Part 2 — Prop API design

### 2.1 Support controlled and uncontrolled with one prop pair

**Rule:** For any stateful value, accept `value` + `onValueChange` (controlled)
_and_ `defaultValue` (uncontrolled); never require the caller to manage state
they don't care about. Resolve via a `useControllableState`-style hook.

**Why:** This is the "control props" pattern (Kent C. Dodds); it lets the same
component serve a quick uncontrolled use and a fully-driven one. Base UI's
primitives already expose this shape, so building on them keeps the convention
consistent. ([Vercel Academy — useControllableState](https://vercel.com/academy/shadcn-ui/use-controllable-state),
[Sherry Hsu — Control Props](https://sherryhsu.medium.com/usecontrollablestate-hook-b4801ec293e5))

```tsx
// GOOD — works both ways.
<ColorField defaultValue="#3b82f6" />                       // uncontrolled
<ColorField value={color} onValueChange={setColor} />        // controlled

// BAD — forces controlled; every caller must wire useState even for a static demo.
<ColorField value={color} onChange={setColor} /> // value required, no default
```

**Sub-rule (no mode switching):** a component is controlled _or_ uncontrolled
for its lifetime — don't let `value` flip between `undefined` and defined. Guard
this in dev. ([react.dev / Radix guidance](https://react.dev/learn/sharing-state-between-components))

### 2.2 Kill the boolean trap — use a variant union

**Rule:** When booleans are mutually exclusive or describe "what kind", replace
them with a single string-union `variant`/`size`/`tone` prop. Reserve booleans
for genuinely independent on/off facts (`disabled`, `loading`).

**Why:** Multiple booleans permit nonsensical states (`isPrimary` +
`isDanger`), bloat the API, and need lint rules to police. A variant union
bounds the values, makes invalid combinations unrepresentable, and extends
cleanly. This is exactly how `@tumaet/ui` already models buttons via cva.
([Spice Factory — Boolean Trap](https://spicefactory.co/blog/2019/03/26/how-to-avoid-the-boolean-trap-when-designing-react-components/),
[MUI API guide](https://mui.com/material-ui/guides/api/))

```tsx
// GOOD — one bounded axis. cva validates + defaults it (see ui/button.tsx).
type ButtonProps = { variant?: "default" | "outline" | "ghost" | "destructive" }

// BAD — the boolean trap: 2^3 combos, most invalid; what does primary+danger mean?
type ButtonProps = {
  isPrimary?: boolean
  isSecondary?: boolean
  isDanger?: boolean
}
```

### 2.3 Name events `onX`, hand back the _value_ not the _event_

**Rule:** Handlers are `onSomething`; the payload is the meaningful value, not a
raw DOM event. Use `onXChange(value)` for value changes; pass the event only
when the caller plausibly needs it (and then as a second arg, or via `event`).

**Why:** `onValueChange(next)` lets callers `setState` directly without
`e.target.value` plumbing, and decouples the API from the DOM event shape — the
same component can later back onto a non-`<input>` primitive without breaking
callers. It mirrors Base UI / Radix conventions the design system builds on.

```tsx
// GOOD — caller writes onValueChange={setName}. No event archaeology.
type NameFieldProps = { value: string; onValueChange: (value: string) => void }

// BAD — leaks the DOM event; every caller does e.target.value, and the API is
// now welded to <input>.
type NameFieldProps = {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}
```

### 2.4 Required vs optional: optional with sensible defaults, required only when there's no safe default

**Rule:** Make a prop required only when no default could be correct (e.g. a
`label`, a list's `items`). Everything visual/behavioral gets a sensible
default. Default in the destructure, not with `defaultProps` (removed for
function components).

**Why:** Minimizes ceremony at the call site and keeps the common case
one-liner-short, while still forcing callers to supply data that _must_ be
caller-specific.

```tsx
// GOOD
function Badge({ tone = "neutral", children }: BadgeProps) {
  /* ... */
}
;<Badge>New</Badge>

// BAD — forces a decision the component could have made.
function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {}
;<Badge tone="neutral">New</Badge> // every single call must repeat this
```

### 2.5 Keep prop count low; prefer composition to a prop avalanche

**Rule:** If a component grows past ~7 props or sprouts `renderHeader` /
`showFooter` / `headerProps` config props, that's a smell — split it or expose
slots (Part 3).

**Why:** Configuration props don't compose and multiply combinatorially;
children/slots do. A large flat prop list is hard to learn and harder to evolve.
([MUI API guide](https://mui.com/material-ui/guides/api/))

```tsx
// GOOD — composition; Card doesn't need to know what a header contains.
<Card>
  <Card.Header><h3>Class diagram</h3></Card.Header>
  <Card.Body>{children}</Card.Body>
</Card>

// BAD — config explosion; every new need adds a prop.
<Card title="Class diagram" headerIcon={<Icon/>} showHeaderDivider headerAlign="left"
      footer={<Save/>} footerProps={{ sticky: true }} bodyPadding="lg" />
```

### 2.6 Avoid prop drilling by composition, not by reflex context

**Rule:** When data passes through layers that don't use it, first **extract a
component and pass JSX as `children`**; reach for context only after that fails
(see 1.3).

**Why:** React docs name this the primary fix for drilling — intermediate
components that only forward props usually signal a missing composition seam.
([react.dev — Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context))

```tsx
// GOOD — Layout doesn't touch `posts`; the caller composes.
<Layout><PostList posts={posts} /></Layout>

// BAD — Layout forwards posts it never reads, just to reach a descendant.
<Layout posts={posts} />
```

### 2.7 Spread `...rest` and pass through `data-*`/`aria-*`; type it from the host element

**Rule:** Presentational primitives extend the underlying element's props and
spread `...rest` onto it, so `data-*`, `aria-*`, `id`, `onClick`, etc. pass
through for free. Spread _before_ your own controlled attributes so the
component wins where it must.

**Why:** Consumers constantly need one-off attributes (test ids, ARIA, analytics
`data-*`). Passthrough avoids a prop for every conceivable HTML attribute. Be
deliberate about _which_ element receives the rest — don't blindly forward every
prop to every child. ([React TS Cheatsheet](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/basic_type_example/))

```tsx
// GOOD — caller can do <Input data-testid="x" aria-invalid maxLength={10} />.
function Input({ className, ...rest }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={cn("…", className)} {...rest} />
}

// BAD — opaque box; caller can't add aria-describedby without a code change.
function Input({ value, onChange }: { value: string; onChange: () => void }) {
  return <input value={value} onChange={onChange} />
}
```

### 2.8 Merge `className`/`style`, never overwrite

**Rule:** Always merge an incoming `className` with `cn(...)` (clsx +
tailwind-merge) so caller classes override defaults predictably; never drop the
component's base classes and never drop the caller's.

**Why:** `tailwind-merge` resolves conflicts so a caller's `h-[42px]` cleanly
beats a default `h-9` instead of both landing in the class list — this is
precisely why the repo's `cn` exists (`packages/ui/src/lib/utils.ts`).

> **Library boundary:** this applies in `@tumaet/ui` and `@tumaet/webapp`
> (Tailwind). In `@tumaet/apollon` there is **no Tailwind** — style via
> `--apollon-*` CSS variables and `data-*` hooks, and still merge `className`
> with plain `clsx`/string join so consumer overrides work. Do not import
> `tailwind-merge` into the library. (`AGENTS.md` styling boundary.)

```tsx
// GOOD
className={cn("inline-flex h-9 px-3", className)}

// BAD — silently discards the caller's className.
className={`inline-flex h-9 px-3`}
// BAD — both classes survive; the override doesn't win.
className={`inline-flex h-9 px-3 ${className}`}
```

### 2.9 React 19: `ref` is a prop (delete `forwardRef`); read context with `use()`

**Rule:** New components take `ref` as a normal prop — do not wrap in
`forwardRef`. Type it via `React.ComponentProps<"el">` (which includes `ref` in
React 19) or an explicit `ref?: React.Ref<T>`. Read context with `use(Context)`,
not `useContext(Context)`.

**Why:** React 19 lets function components receive `ref` directly; `forwardRef`
is now redundant boilerplate on the deprecation path. `use()` reads context like
`useContext()` but may be called conditionally (e.g. after an early return),
removing a class of hook-ordering contortions. Less indirection, cleaner types,
better composition. ([react.dev — forwardRef](https://react.dev/reference/react/forwardRef),
[Saeloun — ref as prop](https://blog.saeloun.com/2025/03/24/react-19-ref-as-prop/),
[react.dev — use](https://react.dev/reference/react/use),
[eslint-react no-forward-ref](https://eslint-react.xyz/docs/rules/no-forward-ref))

```tsx
// GOOD — React 19: ref as prop, context via use().
function Input({ ref, ...rest }: React.ComponentProps<"input">) {
  return <input ref={ref} {...rest} />
}
function ComposerInput() {
  const ctx = use(ComposerContext) // not useContext; may be called conditionally
  return <textarea value={ctx?.state.input ?? ""} />
}

// BAD — legacy ceremony, extra wrapper type, deprecation-bound.
const Input = forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} {...props} />
))
```

---

## Part 3 — Composition patterns

### 3.1 Slots/children beat configuration props

**Rule:** Hand a component _content_ via `children` or named slot props (which
accept `ReactNode`), not a pile of `renderX` flags. Reach for config props only
for primitives the component genuinely owns.

**Why:** Composition is open/extensible — the parent decides content without the
component anticipating every case. This is the core CDD premise: build UIs
bottom-up from composable pieces. ([Storybook CDD](https://storybook.js.org/),
[MUI API guide](https://mui.com/material-ui/guides/api/)) See 2.5 for the
good/bad example.

### 3.2 Compound components share state via private context

**Rule:** Multi-part widgets (`Tabs`, `Select`, `Dialog`, `RadioGroup`) expose
sub-components and coordinate through an **internal** context — the consumer
composes the parts; the parts wire themselves.

**Why:** Gives a declarative, flexible API (`<Tabs><Tabs.List>…`) without
prop-drilling shared state, and lets consumers reorder/omit parts. The context
here is _implementation detail_, not app state, so it doesn't violate 1.3. Base
UI's components are already structured this way; `@tumaet/ui` mirrors their
parts.

```tsx
// GOOD — consumer composes; selection state is shared via internal context.
<Tabs defaultValue="uml">
  <Tabs.List>
    <Tabs.Trigger value="uml">UML</Tabs.Trigger>
    <Tabs.Trigger value="bpmn">BPMN</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="uml">…</Tabs.Panel>
</Tabs>

// BAD — config object reinvents JSX, loses flexibility & a11y wiring.
<Tabs tabs={[{ id: "uml", label: "UML", content: <…/> }]} active="uml" />
```

### 3.3 Polymorphism: prefer Base UI's `render` prop; standardize on one mechanism

**Rule:** To let a component render _as_ a different element/component, use Base
UI's `render` prop (the repo's primitive lib). Treat Radix's `asChild` as the
equivalent only where you're inside Radix. Don't invent a third mechanism.

**Why:** Polymorphism avoids wrapper-element soup and lets a `Button` become an
`<a>` or a router `<Link>` while keeping styling and a11y. Base UI's `render`
is more explicit and predictable than `asChild` — clearer for humans and AI
assistants — and it's what our stack ships. ([Base UI — useRender](https://base-ui.com/react/utils/use-render),
[Radix — Composition](https://www.radix-ui.com/primitives/docs/guides/composition),
[boda.sh — Slot/asChild](https://boda.sh/blog/react-slot-aschild-pattern/))

```tsx
// GOOD — Base UI render prop: a styled Button that's really a router Link.
<Button render={<Link to="/editor" />}>Open editor</Button>

// BAD — duplicate component just to change the tag; styles/a11y now drift.
<a className="btn btn-default" href="/editor">Open editor</a>
```

### 3.4 Render props/slots over hardcoded internals when the consumer must own rendering

**Rule:** When a component manages logic but the _item_ rendering is
caller-specific (lists, virtualized rows, menus), expose a render slot
(`renderItem`, or `children` as a function) rather than hardcoding item markup.

**Why:** Keeps the logic reusable while the presentation stays in the consumer's
hands — composition where it counts, configuration nowhere else.

```tsx
// GOOD — logic owned by the list; row markup owned by the caller.
<VirtualList items={diagrams} renderItem={(d) => <DiagramRow diagram={d} />} />

// BAD — list hardcodes a row; unusable for any other shape.
<VirtualList items={diagrams} /> // renders a fixed <div>{item.name}</div>
```

### 3.5 For multi-mode widgets: a provider over a generic `state`/`actions`/`meta` context, and explicit variant components

**Rule:** When a widget has several _behavioral modes_ (a composer that is also
a thread reply / an edit form / a forward dialog; a version panel that is a
drawer / inline sidebar), do **not** add `isThread`/`isEditing` booleans or a
`variant` prop that forks behavior. Instead: (a) build the widget as compound
sub-components that read a single context typed as a generic
`{ state, actions, meta }` contract; (b) put _all_ knowledge of where state
comes from in a **Provider** component; (c) expose each mode as its own named
**variant component** that composes a provider + the sub-components it needs.
The same presentational sub-components then work unchanged whether the provider
is backed by `useState`, a zustand store, or a server sync — dependency
injection through context.

**Why:** Booleans/`variant` props that fork _behavior_ multiply invalid states
(2³ = 8 states for three flags) and bury the real shape in conditionals. A
`state`/`actions`/`meta` contract decouples UI from state management so a
provider can be swapped without touching a single sub-component, and lets
siblings _outside_ the main tree (a dialog footer button, a live preview) read
or drive the same state with no prop-drilling or ref gymnastics. Named variant
components are self-documenting — the call site reads like what it renders.
This is Fernando Rojo's "Composition is all you need."
([vercel-labs/agent-skills — composition-patterns](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns))

```tsx
// Contract — UI depends on this shape, never on a concrete store.
interface ComposerContextValue {
  state: { input: string; attachments: Attachment[]; isSubmitting: boolean }
  actions: { update: (fn: (s: State) => State) => void; submit: () => void }
  meta: { inputRef: React.RefObject<HTMLTextAreaElement | null> }
}
const ComposerContext = createContext<ComposerContextValue | null>(null)

function ComposerInput() {
  const { state, actions, meta } = use(ComposerContext)! // sub-component reads context
  return (
    <textarea
      ref={meta.inputRef}
      value={state.input}
      onChange={(e) => actions.update((s) => ({ ...s, input: e.target.value }))}
    />
  )
}

// GOOD — each mode is a named variant: a provider (owns state impl) + composed parts.
function ThreadComposer({ channelId }: { channelId: string }) {
  return (
    <ThreadProvider channelId={channelId}>
      {" "}
      {/* provider: zustand-backed here */}
      <Composer.Frame>
        <Composer.Input />
        <AlsoSendToChannelField channelId={channelId} />
        <Composer.Footer>
          <Composer.Submit />
        </Composer.Footer>
      </Composer.Frame>
    </ThreadProvider>
  )
}

// BAD — one component, behavior forked by booleans: 8 states, most invalid.
;<Composer isThread isEditing={false} showAttachments channelId="abc" />
```

**Scope note:** reserve this for genuinely multi-mode/compound widgets. A simple
leaf (a toggle button, a card) stays pure props-in/callbacks-out (1.1) — don't
stand up a provider for a single button. In this repo the prescribed home for
this pattern is the heavy widgets (e.g. the version sidebar/drawer, the
share-dashboard dialog) when they're refactored.

---

## Part 4 — Separation of concerns (why presentational pays off)

### 4.1 Keep fetching, global state, routing, and side effects out of presentational components

**Rule:** Presentational components must not call `fetch`/query hooks, read or
write zustand/redux, call `useNavigate`/`useParams`, or run domain `useEffect`s.
Those live in container hooks (Part 1) or feature/route components.

**Why:** A component that touches the network, the store, and the router can only
be rendered inside a fully-booted app — its stories need MSW, a store provider,
and a router just to paint one state. Decoupling rendering from logic yields
fewer brittle tests and faster iteration. ([Storybook + MSW / CDD](https://storybook.js.org/),
[Component Test with Storybook + Vitest](https://storybook.js.org/blog/component-test-with-storybook-and-vitest/))

```tsx
// GOOD — every visual state is one prop combo → one story, zero mocks.
export const Loading = { args: { status: "loading" } }
export const Error = { args: { status: "error", message: "Save failed" } }
function SaveBar({ status, message, onRetry }: SaveBarProps) {
  /* pure */
}

// BAD — to story this you must mock the store, the query, and the router.
function SaveBar() {
  const status = useSaveStore((s) => s.status)
  const retry = useRetryMutation()
  const navigate = useNavigate()
  /* … */
}
```

### 4.2 The container hook is the seam; test it separately

**Rule:** Test presentational components by rendering with props (Storybook
play/interaction tests, Vitest); test container hooks with `renderHook` and
mocked stores/queries. Don't test both concerns through one giant component.

**Why:** Storybook 10 + Vitest run interaction, a11y, and visual checks straight
off stories — but only if the component _has_ clean prop-driven states. The
seam makes both halves cheap to test. ([Storybook testing](https://storybook.js.org/blog/component-test-with-storybook-and-vitest/))

---

## Part 5 — TypeScript API ergonomics

### 5.1 Extend the host element's props with `ComponentProps`

**Rule:** For element-backed primitives, base props on
`React.ComponentProps<"button">` (React 19 — includes `ref`) or a primitive's
own `Props` type (e.g. `ButtonPrimitive.Props`), then intersect your extras.
Avoid `ComponentPropsWithoutRef` unless you're deliberately not forwarding a ref.

**Why:** You inherit every valid attribute + event + `ref` with correct types,
for free, and stay in sync with the DOM. ([Total TypeScript — ComponentProps](https://www.totaltypescript.com/concepts/react-componentprops-type-helper),
[React TS Cheatsheet](https://github.com/typescript-cheatsheets/react))

```tsx
// GOOD — inherits onClick, disabled, aria-*, ref, … plus our variant union.
type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>

// BAD — reinvents a fraction of the surface; consumers can't pass aria-label.
type ButtonProps = { label: string; onClick: () => void }
```

### 5.2 Model dependent props with discriminated unions

**Rule:** When one prop's presence dictates others (e.g. `as="link"` requires
`href`; `loading` forbids `children`), express it as a discriminated union, not
loose optionals validated at runtime.

**Why:** Makes invalid states unrepresentable at compile time — the API
documents and enforces its own rules. ([Steve Kinney — Discriminated Unions](https://stevekinney.com/courses/react-typescript/typescript-discriminated-unions),
[Developer Way — Discriminated Unions](https://www.developerway.com/posts/advanced-typescript-for-react-developers-discriminated-unions),
[oneuptime](https://oneuptime.com/blog/post/2026-01-15-typescript-discriminated-unions-react-props/view))

```tsx
// GOOD — TS forbids <IconButton> with neither/both; requires aria-label always.
type IconButtonProps =
  | { icon: ReactNode; "aria-label": string; label?: never }
  | { label: string; icon?: never; "aria-label"?: never }

// BAD — both optional; nothing stops an unlabeled icon-only button (a11y bug).
type IconButtonProps = {
  icon?: ReactNode
  label?: string
  "aria-label"?: string
}
```

### 5.3 Derive variant prop types from cva; never restate them

**Rule:** Use `VariantProps<typeof xVariants>` so the union of variants is the
single source of truth (it already validates + defaults at runtime).

**Why:** One definition for runtime _and_ types; adding a variant can't drift
out of sync. This is the established `@tumaet/ui` pattern.

```tsx
// GOOD
const badgeVariants = cva("…", {
  variants: { tone: { neutral: "", info: "", danger: "" } },
})
type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>

// BAD — duplicated union drifts from cva the first time someone adds "warning".
type BadgeProps = { tone?: "neutral" | "info" | "danger" }
```

### 5.4 Generic components for collections; keep payloads typed end-to-end

**Rule:** When a component renders caller-supplied items, make it generic
(`<T,>`) so `items: T[]` and `renderItem: (item: T) => ReactNode` stay linked —
no `any`, no casts at the call site.

**Why:** Preserves type flow from data to render callback; the consumer gets
autocomplete on `item`. ([LogRocket — polymorphic/generic components](https://blog.logrocket.com/build-strongly-typed-polymorphic-components-react-typescript/))

```tsx
// GOOD
function List<T>({
  items,
  renderItem,
}: {
  items: T[]
  renderItem: (item: T) => ReactNode
}) {
  return (
    <ul>
      {items.map((it, i) => (
        <li key={i}>{renderItem(it)}</li>
      ))}
    </ul>
  )
}

// BAD — any severs the link; renderItem loses all type info.
function List({
  items,
  renderItem,
}: {
  items: any[]
  renderItem: (item: any) => ReactNode
}) {}
```

### 5.5 Ban `any`; JSDoc the public surface

**Rule:** No `any` in a component's public types — use `unknown` + narrowing,
generics, or precise unions. JSDoc every exported prop type and non-obvious prop
(it surfaces in editor tooltips and Storybook autodocs).

**Why:** `any` deletes the API contract; precise types _are_ the docs. JSDoc
turns the prop table into self-documenting hover help. ([React TS Cheatsheet](https://github.com/typescript-cheatsheets/react))

```tsx
// GOOD
type ToastProps = {
  /** Auto-dismiss delay in ms. `0` keeps the toast until dismissed. */
  duration?: number
  /** Called after the toast leaves the DOM (animation complete). */
  onClosed?: () => void
}

// BAD
type ToastProps = { options?: any }
```

---

## Part 6 — Accessibility & API stability

### 6.1 Accessibility is part of the prop API, not a finishing step

**Rule:** Render semantic elements by default (`<button>`, `<nav>`, `<label>`);
require the label that makes a control accessible (see 5.2's `aria-label`
discriminant); associate inputs with labels via `Field`/`htmlFor`/`id`; pass
through `aria-*` (2.7). Lean on Base UI primitives, which ship roles/focus
management — don't re-implement them.

**Why:** If the accessible name is optional, half the call sites will omit it.
Bake a11y into the type system and the defaults so the correct thing is the easy
thing. Base UI provides the keyboard/ARIA behavior; your job is not to break it.
([Base UI](https://base-ui.com/react/utils/use-render), [MUI API guide](https://mui.com/material-ui/guides/api/))

```tsx
// GOOD — semantic, labeled, association enforced by the component.
<Field>
  <Field.Label>Diagram name</Field.Label>
  <Field.Control render={<Input />} />
</Field>

// BAD — div soup, no accessible name, no label association.
<div onClick={save} role="button"><input placeholder="Diagram name" /></div>
```

### 6.2 Treat the public prop surface as a stable contract

**Rule:** Public props of `@tumaet/apollon` and `@tumaet/ui` are
semver-relevant. Adding an optional prop is a minor; renaming/removing/retyping
or changing a default is a **breaking change** — deprecate first, then remove,
and record it with a changeset.

**Why:** `@tumaet/apollon` is consumed by the webapp, the VS Code extension, and
external embedders; a careless prop rename ripples everywhere (`AGENTS.md`).
Internal/implementation props (compound-component context, `data-slot`) are not
the contract and can change freely. Run `pnpm changeset` for any API-affecting
change.

```tsx
// GOOD — additive, backward-compatible. Old default behavior preserved.
type EditorProps = { /* …existing… */ readonly?: boolean } // new optional prop

// BAD — silent breaking change for every embedder; no deprecation, no changeset.
- type EditorProps = { onChange: (m: Model) => void }
+ type EditorProps = { onModelChange: (m: Model) => void } // renamed in place
```

### 6.3 Keep `data-slot` / `data-*` styling hooks stable but private-by-default

**Rule:** `data-slot="…"` and `data-variant`/`data-size` are the styling
contract between markup and CSS (the library's Tailwind-free theming and the
UI package's `components.css`). Keep their names stable; treat them as an
_internal_ contract unless explicitly documented for theming.

**Why:** The library ships compiled CSS keyed on these attributes so it can embed
anywhere without leaking utilities (see `ui/button.tsx`, `AGENTS.md`). Renaming a
slot silently breaks theming for every consumer of that compiled CSS.

---

## Decision checklist

Run this on every component you build or refactor. If you answer "no" to a
required item, fix it or write down why.

**Presentational purity (Part 1, 4)**

- [ ] Is this a leaf/UI component? If so, is it **pure** — props in, callbacks out, no fetch/store/router/`useEffect`?
- [ ] If it reads context/store directly, do **all three** of 1.3's criteria hold (ambient + drilling-not-fixable-by-composition + not reused outside provider)?
- [ ] Is wiring (queries, zustand, router) pushed into a container **hook**, not a wrapper component?
- [ ] Can every visual state be reached by props alone (so it stories with **zero mocks**)?

**Prop API (Part 2)**

- [ ] Stateful values support **controlled + uncontrolled** (`value`/`onValueChange`/`defaultValue`)?
- [ ] No **boolean trap** — mutually-exclusive flags collapsed into a `variant`/`size` union?
- [ ] Events named `onX` and hand back the **value**, not the raw DOM event?
- [ ] Optional-with-defaults by default; **required** only where no safe default exists?
- [ ] ≤ ~7 props and no `renderX`/`showX` config explosion (else use slots)?
- [ ] Drilling fixed by **composition/`children`** before any context?
- [ ] `...rest` + `data-*`/`aria-*` passthrough to the right element?
- [ ] `className` merged with `cn` (UI/webapp) or `clsx`/join (library — **no tailwind-merge**), never overwritten?

**React 19 / refs**

- [ ] `ref` taken as a **prop** — no `forwardRef`?
- [ ] Context read with **`use()`**, not `useContext()`?

**Composition (Part 3)**

- [ ] Content via `children`/slots, not config props?
- [ ] Multi-part widget uses compound components + **internal** context?
- [ ] Multi-_mode_ widget uses a **provider over a `state`/`actions`/`meta` contract** + **named variant components**, not behavioral booleans/`variant` props (3.5)?
- [ ] Polymorphism via Base UI **`render`** (not a bespoke mechanism)?

**TypeScript (Part 5)**

- [ ] Props extend `React.ComponentProps<...>` / the primitive's `Props`?
- [ ] Dependent props modeled as a **discriminated union**?
- [ ] Variant types **derived** from cva (`VariantProps`)?
- [ ] Generic over caller-supplied item types — **no `any`** in the public surface?
- [ ] Exported prop types **JSDoc'd**?

**Accessibility & stability (Part 6)**

- [ ] Semantic element + **enforced accessible name** + label association?
- [ ] Public prop change is **additive**, or deprecated-then-removed with a **changeset**?
- [ ] `data-slot`/`data-*` styling-hook names left stable?

**Repo boundaries (AGENTS.md)**

- [ ] In `@tumaet/apollon`: **no Tailwind, no CSS-in-JS** — styled via `--apollon-*` vars + `data-*`?
- [ ] No standalone-only assumptions baked into a library API (gated behind options)?

---

## Sources

- React — [Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) · [forwardRef](https://react.dev/reference/react/forwardRef) · [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
- Kent C. Dodds — [Hooks & Container/Presenter (ama#545)](https://github.com/kentcdodds/ama/issues/545) · falldowngoboone — [Container pattern with Context & Hooks](https://www.falldowngoboone.com/blog/container-component-pattern-using-context-and-hooks/) · [All Insight Lab — Container vs Presentational in 2025](https://allinsightlab.com/container-vs-presentational-components-still-relevant-in-2025/)
- Control props / controlled-uncontrolled — [Vercel Academy — useControllableState](https://vercel.com/academy/shadcn-ui/use-controllable-state) · [Sherry Hsu — Control Props](https://sherryhsu.medium.com/usecontrollablestate-hook-b4801ec293e5)
- Boolean trap & variants — [Spice Factory](https://spicefactory.co/blog/2019/03/26/how-to-avoid-the-boolean-trap-when-designing-react-components/) · [MUI API design guide](https://mui.com/material-ui/guides/api/)
- Composition / polymorphism — [Base UI — useRender](https://base-ui.com/react/utils/use-render) · [Radix — Composition](https://www.radix-ui.com/primitives/docs/guides/composition) · [boda.sh — Slot/asChild](https://boda.sh/blog/react-slot-aschild-pattern/)
- Composition-driven architecture (provider + `state`/`actions`/`meta` DI, variant components, `use()`) — Fernando Rojo, ["Composition is all you need" / vercel-labs agent-skills — composition-patterns](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns)
- TypeScript — [Total TypeScript — ComponentProps](https://www.totaltypescript.com/concepts/react-componentprops-type-helper) · [React TS Cheatsheet](https://github.com/typescript-cheatsheets/react) · [Steve Kinney — Discriminated Unions](https://stevekinney.com/courses/react-typescript/typescript-discriminated-unions) · [Developer Way — Discriminated Unions](https://www.developerway.com/posts/advanced-typescript-for-react-developers-discriminated-unions) · [LogRocket — Polymorphic components](https://blog.logrocket.com/build-strongly-typed-polymorphic-components-react-typescript/)
- React 19 refs — [Saeloun — ref as prop](https://blog.saeloun.com/2025/03/24/react-19-ref-as-prop/) · [eslint-react — no-forward-ref](https://eslint-react.xyz/docs/rules/no-forward-ref)
- Storybook / CDD — [Storybook](https://storybook.js.org/) · [Intro to Storybook — simple component](https://storybook.js.org/tutorials/intro-to-storybook/react/en/simple-component/) · [Component Test with Storybook + Vitest](https://storybook.js.org/blog/component-test-with-storybook-and-vitest/)
- Colocation — [egghead — Lifting & colocating React state](https://egghead.io/lessons/react-lifting-and-colocating-react-state)
