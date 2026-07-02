---
"@tumaet/apollon": minor
---

Fix UML class-diagram notation and let methods be marked abstract.

- **Abstract is now UML-correct.** An abstract class shows an _italic_ name instead of the invalid `«Abstract»` keyword — UML has no `«abstract»` keyword; abstractness is a property, not a stereotype (UML 2.5.1 §9.2.4). The italic is a real shipped Inter italic face, so it renders the same in the editor and in PNG, PDF, and PowerPoint exports — no more `{abstract}` text fallback for a slant that used to vanish on export.
- **Metaclass keywords are lowercase.** Interfaces and enumerations render `«interface»` / `«enumeration»` — the exact UML keyword spelling (2.5.1 Table C.1) — instead of the capitalized forms.
- **New: abstract methods.** Mark any method abstract from the class editor (a per-method toggle) to render its signature in italics. Attributes are deliberately not offered the control: UML attributes cannot be abstract. Closes #105.
- **A single "Class type" picker.** The class editor now sets the classifier with one dropdown — `Class`, `Abstract Class`, `Interface`, `Enumeration` — mirroring the four palette tiles and the other node/edge "type" selects, with a notation preview on each option. It replaces a checkbox-plus-toggle pair that could produce invalid states (an italic `«interface»`, or an abstract enumeration); those states are now unrepresentable, and any earlier diagram carrying one self-heals on load.

Diagrams saved earlier migrate automatically on load — a class stored with the old `"Abstract"` stereotype becomes `isAbstract`, `"Interface"` / `"Enumeration"` are lowercased to their keyword spelling, and a stray abstract modifier on a keyword is dropped.
