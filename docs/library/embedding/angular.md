---
id: angular
title: Angular
description: Embed Apollon in an Angular host using the default standalone bundle.
---

# Angular

Use the **standalone subpath** (`@tumaet/apollon`). Angular hosts get the editor with **zero peer deps** to install — React is bundled inside the tarball.

```ts
import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from "@angular/core"
import {
  ApollonEditor,
  ApollonMode,
  Locale,
  UMLDiagramType,
} from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

@Component({
  selector: "app-diagram-editor",
  standalone: true,
  template: `<div #container style="width: 100%; height: 100%"></div>`,
})
export class DiagramEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild("container", { static: true })
  containerRef!: ElementRef<HTMLDivElement>

  private editor?: ApollonEditor

  ngAfterViewInit(): void {
    this.editor = new ApollonEditor(this.containerRef.nativeElement, {
      type: UMLDiagramType.ClassDiagram,
      mode: ApollonMode.Modelling,
      locale: Locale.en,
    })
  }

  ngOnDestroy(): void {
    this.editor?.destroy()
  }
}
```

The editor mounts its own React tree inside the `<div>` you give it. Your Angular code only sees the imperative API.

The `<div>` must have an explicit height, or the editor renders blank — see
[Troubleshooting](/library/troubleshooting).

## SSR / Universal

The editor is client-only — it touches `window` at construction. Inside Angular Universal, guard with `isPlatformBrowser(this.platformId)` and construct only after hydration. See [Troubleshooting](/library/troubleshooting) for details.
