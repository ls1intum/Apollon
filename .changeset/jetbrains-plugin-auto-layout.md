---
"@tumaet/jetbrains-plugin": minor
---

Tidy any diagram in one click with **Auto layout**, from the button on the canvas or **Tools →
Architect Studio → Auto Layout**. Relationships decide the rows — an arrow points from one row to the
next — unconnected elements are packed into a grid underneath, and arrows are re-routed instead of
being dragged along behind their boxes. It runs only when you ask for it: it moves everything when
you do, so `Ctrl+Z` puts your own arrangement back, and once it has run the diagram is yours again —
anything you move afterwards stays where you put it, through a save, an edit in the source, or a
reopen. Auto layout is there to help you start, not to keep having opinions about your diagram.

The **View** tab is now a split editor: the PlantUML source on one side, the render on the other,
with the same Editor / Split / Preview switch Markdown has in the tab's top-right corner. Whichever
layout you pick is how the next file opens, and each file remembers its own. The render keeps up with
the file — it follows your keystrokes, an edit in **Text**, or an edit on the canvas, rather than
showing the diagram as it was when you opened it. A diagram wider than the tab scales to fit instead
of being squashed, the render sits on the IDE's own background rather than a white slab, and **1:1**,
**Fit width** and `Ctrl`/`⌘`+scroll let you zoom in on a large one. A file with several `@startuml`
blocks shows every one of them, and a PlantUML syntax error is reported with its line number in a few
lines instead of a wall of text.

C4 diagrams render with no internet connection. The plugin now ships the C4-PlantUML macros and
themes itself, so the `!includeurl https://…/C4-PlantUML/…` header at the top of a C4 file is
answered from inside the plugin rather than from GitHub — as is a `!include <C4/…>`, a relative
path, or an include that reaches for one of the C4 themes. `!theme C4_united` now applies the theme
instead of being ignored. Nothing is fetched and nothing else on disk is read, so a C4 file written
anywhere else comes up in **View** at a version that does not shift underneath you — and, with the
split above, comes up beside its source on a plane.

A diagram that includes your own files renders in **View**. `!include ../lib/house-style.puml` used to
come back "cannot include …" — the plugin had no idea which folder the file was in, so a relative path
had nothing to be relative to. Paths now resolve from the folder the file sits in, the way `plantuml` on
the command line resolves them, through as many levels of include as you have and anywhere in the
project. If your project keeps its own copy of C4-PlantUML, that copy is what renders: the bundled
macros above only stand in for an include that is not on disk, so pinning your own version stays your
call.

Installing Architect Studio no longer breaks the **PlantUML integration** plugin. Its preview shares
PlantUML's process-wide settings with us, and ours were locking it out of the network — so its side
of a split editor answered "Cannot open URL" for any diagram that includes something from the web.
Architect Studio now applies its own settings to its own rendering and puts them back afterwards, so
both previews work. If you have hit this, restart the IDE after updating: the old setting is read
once per session.
