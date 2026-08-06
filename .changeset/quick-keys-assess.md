---
"@tumaet/apollon": patch
"@tumaet/ui": patch
---

Everything renders sharp. Zooming a diagram no longer leaves nodes pixelated
until you pan, hovering one no longer softens it for a moment, and dialogs, the
drop overlay and popovers are crisp instead of faintly fuzzy. Behind each of
those was the same thing: the browser being handed a reason to redraw a surface
from a stale, lower-resolution copy. Panels keep their translucent tint and
modals keep their scrim.

Marking an element looks the same wherever you do it. Assessment and the element
picker now share one highlight treatment instead of two that drifted, so a
selected node or relationship reads identically in both. Relationships are also
far easier to hit while assessing, without a coloured band across the diagram,
and connection points no longer light up or turn the cursor into a crosshair
where nothing can be connected.

The element whose feedback is open stays highlighted until you close or leave
it, and Cmd/Ctrl with the arrow keys moves to the previous or next assessment —
including while you are still typing in the comment box.

Scroll lock also behaves. Releasing the zoom key re-locks the canvas again
instead of leaving it unlocked for the rest of the session, the hint names the
key your own keyboard has, it is translatable, and touch devices are told to use
two fingers rather than a key they do not have.

A feedback list beside the diagram can now drive it: `revealAssessment(id)`
selects an element, opens its feedback and pans to it at the current zoom. The
read-only feedback popover a student sees when reviewing a graded diagram also
opens on click — it was built for exactly that and had been unreachable.

Reviewing an assessed diagram is quieter, too. Clicking an element nobody graded
no longer answers with an empty "Not graded" card, and previous/next assessment
steps between the elements that actually carry a score or a comment instead of
every element on the canvas. Host highlights are drawn beneath the element they
mark, so a score badge is never covered by the ring pointing at it.

Assessment badges and popovers sit where they belong. A relationship's badge now
rides its own line instead of floating above it, and its feedback opens beside
that badge rather than on top of the element the relationship points at. Every
element type rings the same way when highlighted, and the ring is drawn under
the badge it is pointing at rather than across it.

Reviewing an assessment reads as one state. Whichever element you are on — a
class, a package, a relationship — it is marked in the same colour, moving to
the next or previous assessment marks the new element straight away instead of
leaving the mark behind, and a relationship's own badge keeps its result colour
rather than being repainted by the mark around it.

Feedback is also listed in the order it appears on the diagram — each element
under the one that contains it — rather than in whatever order a tutor happened
to grade things, which put a class's method above the class and its attribute
below.
