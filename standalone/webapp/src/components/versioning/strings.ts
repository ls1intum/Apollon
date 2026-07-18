/**
 * Drawer-local strings for the versioning UI. English-only. Toast copy emitted
 * from stores/pages (eviction warnings, REDIS_UNAVAILABLE, collaborator-restore
 * notice) stays inline at its emission site — this table covers the drawer's
 * static UI only.
 */

/** Mirrors `MAX_DESCRIPTION_LENGTH` in the server config; client trims to avoid a round-trip 400. */
export const MAX_DESCRIPTION_LENGTH = 240

/** Mirrors `MAX_NAME_LENGTH` in the server config; same rationale. */
export const MAX_NAME_LENGTH = 80

export const versioningStrings = {
  drawerTitle: "Version history",
  navMenuItem: "Version history",
  fabTooltip: `Version history (${/mac/i.test(navigator.userAgent) ? "⌥⇧H" : "Alt+Shift+H"})`,
  loadOlder: "Load older versions",
  previewFailed: "Failed to load preview.",
  previewUnavailable: "This version is no longer available.",
  restoreFailed: "Restore failed.",
  emptyBody:
    "Save a version before risky changes. You can always come back to this exact state.",
  emptyBodyLocal:
    "No versions yet. Save one before risky changes — they're stored on this device.",
  emptyCtaLocal: "Save first version",
  composerHint: /mac/i.test(navigator.userAgent)
    ? "⌘+Enter to save"
    : "Ctrl+Enter to save",
  emptyDiagramTooltip: "Add a node before saving a version.",
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
  noChangesToSave: "No changes to save since the last version.",
  failureToCreate: "Couldn't save version. Try again.",
  failureToEdit: "Couldn't update description. Try again.",
  failureRedis:
    "Version history is temporarily unavailable. Your edits are still being saved.",
  failureSchemaUnsupported:
    "This snapshot was created by an older version of the editor and can't be restored automatically.",
  unnamed: "Untitled snapshot",
  // Confirm-when-dirty restore copy (local mode replacement for the 10s
  // undo snackbar — see ConfirmRestoreModal).
  confirmRestoreTitle: "Restore this version?",
  confirmRestoreBody: (label: string) =>
    `Restore ${label}? This replaces your current canvas. We'll save an auto-snapshot first so you can come back.`,
  confirmRestoreButton: "Restore",
  // "Save a local copy" (durability escape hatch on shared/collab URLs).
  saveLocalCopyButton: "Save a local copy",
  saveLocalCopySuccess:
    "Saved as a local copy on this device. You can keep editing here.",
  saveLocalCopyFailed: "Couldn't save a local copy. Try again.",
  justNow: "just now",
  minutesAgo: (n: number) => `${n}m ago`,
  hoursAgo: (n: number) => `${n}h ago`,
  daysAgo: (n: number) => `${n}d ago`,
}
