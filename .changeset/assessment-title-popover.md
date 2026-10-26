---
"@tumaet/apollon": minor
---

Give-feedback boxes now have a title next to the points. An empty title shows "Positive", "Needs Revision" or "Feedback" by the sign of the points, and a round check, cross or "i" badge with the same color marks the title. See-feedback boxes show the title too, and fall back to the linked grading instruction's feedback when the description is empty.

The points field has - and + buttons and arrow-key steps of 0.5, and stays between -100 and 100. Deleting an assessment with content takes a second click. A box without a description now says "Add feedback for the student." The visible "Points" and "Feedback" labels and the "Negative points are allowed." hint are gone; the `negativePointsAllowed` and `assessmentFor` labels are deprecated.

An assessment linked to a grading instruction shows the criterion and grading scale in a chip with a remove button, and its points are locked to the instruction's. Editing the box keeps the link. Dropping an instruction on an assessed element keeps its title and description. An assessment from an AI feedback suggestion shows an "AI Feedback Suggestion" badge that turns into "Adapted AI Feedback Suggestion" on the first change.

On the canvas, feedback with 0 points shows an "i" instead of a warning triangle.

New API: `Assessment.title`, `Assessment.feedbackSuggestion`, the `AssessmentGradingInstruction` type for `Assessment.dropInfo`, and optional labels for the new texts.
