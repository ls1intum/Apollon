/**
 * Centralized strings for the versioning UI. English-only in the first
 * release; punted to the wider webapp i18n when that lands. Keep keys stable.
 */
export const versioningStrings = {
  drawerTitle: "Version history",
  navMenuItem: "Version history",
  fabTooltip: "Version history (⌥⇧H)",
  emptyTitle: "No saved versions yet",
  emptyBody:
    "Save a version before risky changes. You can always come back to this exact state.",
  emptyCta: "Save current as version",
  createPlaceholder:
    "Name this version (optional). Add details on a new line — first line becomes the name.",
  createButton: "Save version",
  createHint: "Tip: ⌘⇧S / Ctrl+Shift+S opens this drawer from anywhere.",
  saving: "Saving…",
  retry: "Retry",
  counter: (n: number, max: number) => `${n} / ${max} versions kept`,
  lastVersion: (latestName: string, ago: string) =>
    `Last version: '${latestName}', ${ago}`,
  noVersionYet: "No version saved yet",
  preview: "Preview",
  restore: "Restore",
  copyLink: "Copy link to this version",
  copied: "Link copied. Anyone with access can open this version.",
  edit: "Edit description",
  delete: "Delete",
  cancel: "Cancel",
  deleteFailed: "Failed to delete version.",
  deleteFallbackBody: "This version will be permanently removed.",
  compareWithCurrent: "Compare with current",
  compareWithOther: "Compare with…",
  swapCompare: "Swap",
  closeCompare: "Close",
  exitPreview: "Exit preview",
  restoreThis: "Restore this version",
  previewBanner: (name: string, ago: string) =>
    `Previewing '${name}' (${ago}) — read-only.`,
  collabCollisionTitle: "You're viewing an old version of this diagram.",
  collabCollisionCta: "Exit preview to rejoin live session",
  restoredSnack: (name: string) =>
    `Restored '${name}'. Your previous canvas was saved.`,
  undoRestore: "Undo restore",
  collaboratorRestoredTitle: (name: string) =>
    `Someone restored '${name}'. Your view was updated.`,
  collaboratorRestoredHint:
    "Local edits before the restore were saved as a snapshot.",
  openAutoSnapshot: "Open auto-snapshot",
  dismiss: "Dismiss",
  failureToCreate: "Couldn't save version. Try again.",
  failureRedis:
    "Version history is temporarily unavailable. Your edits are still being saved.",
  failureBodyTooLarge:
    "This diagram is too large to version (over 5 MB). Try splitting it into smaller diagrams.",
  failureSchemaUnsupported:
    "This snapshot was created by an older version of the editor and can't be restored automatically.",
  failureSchemaUnsupportedCta: "Export as JSON",
  failureVersionDeleted: "This version was deleted by a collaborator.",
  failureReturnToCurrent: "Return to current version",
  syncedFromCollaborator: "Synced changes from another collaborator.",
  notTheCreator:
    "Heads up — this diagram was originally created in a different browser. Continue?",
  diffEmpty: "No structural changes between these versions.",
  diffAdded: "Added",
  diffRemoved: "Removed",
  diffChanged: "Changed",
  currentCanvas: "current canvas",
  unnamed: "Untitled snapshot",
  autoSnapshot: "Auto-saved before restore",
  loading: "Loading…",
  justNow: "just now",
  minutesAgo: (n: number) => `${n}m ago`,
  hoursAgo: (n: number) => `${n}h ago`,
  daysAgo: (n: number) => `${n}d ago`,
}
