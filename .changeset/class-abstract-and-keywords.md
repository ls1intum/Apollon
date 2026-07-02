---
"@tumaet/apollon": minor
---

Fix UML class-diagram notation and let methods be marked abstract.

- **Abstract is now UML-correct.** An abstract class shows an _italic_ name with the standard `{abstract}` annotation instead of the invalid `«Abstract»` keyword — UML has no `«abstract»` keyword; abstractness is a property, not a stereotype (UML 2.5.1 §9.2.4). The italic shows in the editor; `{abstract}` carries the cue through PNG/PDF/SVG export, which ships no italic face.
- **Metaclass keywords are lowercase.** Interfaces and enumerations render `«interface»` / `«enumeration»` — the exact UML keyword spelling (2.5.1 Table C.1) — instead of the capitalized forms.
- **New: abstract methods.** Mark any method abstract from the class editor (a per-method toggle) to render its signature italic + `{abstract}`. Attributes are deliberately not offered the control: UML attributes cannot be abstract. Closes #105.

Diagrams saved earlier migrate automatically on load — a class stored with the old `"Abstract"` stereotype becomes `isAbstract`, and `"Interface"` / `"Enumeration"` are lowercased to their keyword spelling.
