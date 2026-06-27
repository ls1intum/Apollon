---
id: angular
title: Angular
description: Embed Apollon in an Angular host using the default standalone bundle.
---

# Angular

Angular never imports React itself — the editor renders its own React tree
inside the container — but React is a peer the editor uses internally, so you
install it alongside Apollon:
`npm install @tumaet/apollon react react-dom @xyflow/react yjs y-protocols`.

```ts
import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  viewChild,
} from "@angular/core"
import { ApollonEditor, type UMLModel } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

@Component({
  selector: "app-diagram-editor",
  template: `<div #host style="width: 100%; height: 100%"></div>`,
})
export class DiagramEditorComponent {
  readonly initialModel = input<UMLModel>()
  private host = viewChild.required<ElementRef<HTMLDivElement>>("host")

  constructor() {
    const destroyRef = inject(DestroyRef)
    afterNextRender(() => {
      const editor = new ApollonEditor(this.host().nativeElement, {
        model: this.initialModel(),
      })
      const subId = editor.subscribeToModelChange((model) => {
        localStorage.setItem("diagram", JSON.stringify(model))
      })
      destroyRef.onDestroy(() => {
        editor.unsubscribe(subId)
        editor.destroy()
      })
    })
  }
}
```

The editor mounts its own React tree inside the `<div>` you give it. Your
Angular code only sees the imperative API.

## Why this shape (Angular 17.3+)

- **`viewChild.required<…>(...)`** is the [signal-based view query](https://angular.dev/guide/components/queries) — a function you call to read the live `ElementRef`, statically guaranteed non-null with `.required`. It replaces the `@ViewChild` decorator.
- **`afterNextRender(...)`** runs the callback once, after the first DOM commit, **and is a no-op during server-side rendering**. That removes the manual `isPlatformBrowser` guard and the wrong-hook choice of `ngAfterViewInit` for "after the DOM is painted." See [angular.dev — Side effects for non-reactive APIs](https://angular.dev/guide/signals/effect#:~:text=afterNextRender).
- **`inject(DestroyRef).onDestroy(...)`** colocates teardown with setup — no class needs to implement the `OnDestroy` lifecycle interface. See [angular.dev — DestroyRef](https://angular.dev/api/core/DestroyRef).
- **`standalone: true` is the Angular 19+ default**; on 17/18 add it back.
- No `type`/`mode`/`locale` in the minimal example — those are the editor's defaults, so passing them is noise. Pass them only to override.

The `<div>` must have an explicit height, or the editor renders blank — see
[Troubleshooting](/library/troubleshooting).

## Configuration

Pass options as the constructor's second argument:

```ts
import { ApollonEditor, ApollonMode, UMLDiagramType } from "@tumaet/apollon"

new ApollonEditor(this.host().nativeElement, {
  type: UMLDiagramType.BPMN,
  mode: ApollonMode.Assessment,
  collaborationEnabled: true,
})
```

See the [API reference](/library/api) for the full `ApollonOptions` table and
every imperative method on the `ApollonEditor` instance.

## SSR / Angular Universal

The editor is client-only — it touches `window` at construction.
`afterNextRender` is already a no-op on the server, so the snippet above is
SSR-safe by construction. (If you keep the older `ngAfterViewInit` shape,
guard the call with `isPlatformBrowser(this.platformId)` instead.)
