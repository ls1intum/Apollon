---
"@tumaet/apollon": minor
---

Give-feedback boxes now show an editable title next to the score, instead of a plain "Assessment for X" header — a long word in it wraps onto the next line instead of stretching the row. While an assessment mirrors an unaccepted Athena feedback suggestion, its own title now shows up front, and the box carries a small "AI Feedback Suggestion" badge.

Deleting an assessment in a give-feedback box now takes two clicks: the first turns the X into a trash icon, the second deletes. An empty box is still deleted on the first click. Points are limited to the range from -100 to 100, both when typed and when stepped.

An empty title is now filled with the default title ("Feedback", "Positive", "Needs Revision") once the box gets points or a description, or when the title field is left empty; a default title follows the sign of the points, while a typed title is never changed.

A box with points but no description now marks its description field as missing, unless a dropped grading instruction brings its own feedback.

A box whose assessment is linked to a grading instruction now shows it: the points are locked to the instruction's, a link button names the instruction and removes the link in two clicks, and the instruction's feedback text appears above the description unless the description already contains it, with a hint on what the student reads. Editing the box keeps the link; before, any edit dropped it. Dropping an instruction on an element now keeps the assessment's title, the assessor's description and an AI feedback suggestion's state instead of replacing them, and names an untitled or default-titled assessment after the instruction's criterion. Removing the link or dropping an instruction turns an AI feedback suggestion into an adapted one.
