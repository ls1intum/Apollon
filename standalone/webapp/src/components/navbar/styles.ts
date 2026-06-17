/**
 * Shared Tailwind classes for the navbar's text-button triggers (File, Help,
 * Share, Version history). They sit on the always-dark navbar / themed mobile
 * sheet, so the foreground color is set inline by each caller (the `secondary`
 * on-dark gray on desktop, `--apollon-primary-contrast` inside the mobile
 * sheet). These classes only carry shape + interaction, never color.
 */
export const navTriggerClass =
  "inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded-md bg-transparent px-2 py-1.5 text-sm font-medium normal-case outline-none transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
