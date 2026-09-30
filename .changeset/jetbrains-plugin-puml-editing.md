---
"@tumaet/jetbrains-plugin": minor
---

Open a PlantUML file and get three tabs: **View** renders it with PlantUML's own engine, **Edit**
puts it on the visual canvas, and **Text** is the source. All three are the same file, so a change
on the canvas is already in the text when you switch, and undo and save work as they do anywhere
else. Class, object, use case, component, deployment, activity and sequence diagrams are editable,
as are C4 models; every other kind still renders in View. A C4 model is drawn out of deployment
elements, and a sequence diagram opens as a communication diagram — UML's other view of the same
interaction — with the message numbers carrying the order. A sequence file's `box` swimlanes,
activation bars, `alt`/`else` fragments, dividers and notes are not drawn on that canvas, but they
stay where you wrote them, so the file still opens for editing and an untouched save changes
nothing. C4 boxes and arrows show their
technology and description on the canvas and write an edit back into the macro argument it came
from, and a C4 file that pulls its macros in with `!includeurl` renders offline without editing the
include. An empty PlantUML file offers a
diagram-type picker on the canvas, so you can start one without writing any PlantUML by hand.
Packages group their classes on the canvas and save back as `package` blocks, and a note comes onto
the canvas as a description box joined to whatever it annotates and goes back as a PlantUML `note`.
An activity diagram's whole control flow is on the canvas — `if`/`switch`, `fork`/`split`, `while`
and `repeat` loops, `detach` and every branch label — and comes back written the way PlantUML writes
it. Swimlanes, notes and `partition` blocks aren't drawn, but they stay where you put them, and a
partition closes around whichever of its steps are left if you delete some. An activity construct
this version has never seen is kept the same way instead of making the file uneditable.
A class diagram is written back the way you wrote it: an aliased or stereotyped class such as
`class "Order Line" as OL <<entity>>` reaches the canvas along with the relations that reference it,
a class body keeps its member order, its `--` separators and its own spacing until you edit one of
its members, and a relation to a class you never declared draws both ends, as PlantUML does.
PlantUML the canvas can't model is preserved rather than discarded, and node positions are saved
next to the diagram so they travel with the repository.
