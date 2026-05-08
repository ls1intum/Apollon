/**
 * Drawer-local strings for the versioning UI. English-only in the first
 * release; punted to the wider webapp i18n when that lands. Toast copy
 * emitted from stores/pages (eviction warnings, REDIS_UNAVAILABLE,
 * collaborator-restore notice) stays inline at its emission site by
 * convention — the table here covers the drawer's static UI only. Keep
 * keys stable. Each key has at least one reference; orphans are pruned
 * aggressively because adding strings without consumers is how
 * translation drift starts.
 */
export const versioningStrings = {
  drawerTitle: "Version history",
  navMenuItem: "Version history",
  fabTooltip: `Version history (${/mac/i.test(navigator.userAgent) ? "⌥⇧H" : "Alt+Shift+H"})`,
  loadOlder: "Load older versions",
  previewFailed: "Failed to load preview.",
  restoreFailed: "Restore failed.",
  emptyBody:
    "Save a version before risky changes. You can always come back to this exact state.",
  createPlaceholder: "Describe this version (optional)",
  createButton: "Save version",
  saving: "Saving…",
  lastVersion: (ago: string) => `Last saved ${ago}`,
  noVersionYet: "No version saved yet",
  copyLink: "Copy link to this version",
  noDescription: "No description",
  autoSaved: "Checkpoint",
  editDescription: "Edit description",
  addDescription: "Add description",
  copied: "Link copied. Anyone with access can open this version.",
  copyFailed: "Failed to copy link.",
  delete: "Delete",
  cancel: "Cancel",
  deleteFailed: "Failed to delete version.",
  deleteFallbackBody: "This version will be permanently removed.",
  exitPreview: "Exit preview",
  restoreThis: "Restore this version",
  restoredSnack: (name: string) =>
    `Restored '${name}'. Your previous canvas was saved.`,
  undoRestore: "Undo restore",
  collaboratorRestoredTitle: (actor: string) =>
    `${actor} restored an earlier version. Your view was updated.`,
  failureToCreate: "Couldn't save version. Try again.",
  failureToEdit: "Couldn't update description. Try again.",
  failureRedis:
    "Version history is temporarily unavailable. Your edits are still being saved.",
  failureBodyTooLarge:
    "This diagram is too large to version (over 5 MB). Try splitting it into smaller diagrams.",
  failureSchemaUnsupported:
    "This snapshot was created by an older version of the editor and can't be restored automatically.",
  unnamed: "Untitled snapshot",
  justNow: "just now",
  minutesAgo: (n: number) => `${n}m ago`,
  hoursAgo: (n: number) => `${n}h ago`,
  daysAgo: (n: number) => `${n}d ago`,
}
