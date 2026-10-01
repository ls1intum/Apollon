---
"@tumaet/apollon": minor
---

Give-feedback boxes now show an editable title next to the score, instead of a plain "Assessment for X" header — a long word in it wraps onto the next line instead of stretching the row. While an assessment mirrors an unaccepted Athena feedback suggestion, its own title now shows up front, and the box carries a small "AI Feedback Suggestion" badge.

Deleting an assessment in a give-feedback box now takes two clicks: the first turns the X into a trash icon, the second deletes. An empty box is still deleted on the first click. Points are limited to the range from -100 to 100, both when typed and when stepped.

An empty title is now filled with the default title ("Feedback", "Positive", "Needs Revision") once the box gets points or a description, or when the title field is left empty; a default title follows the sign of the points, while a typed title is never changed.

A box with points but no description now marks its description field as missing, unless a dropped grading instruction brings its own feedback.
