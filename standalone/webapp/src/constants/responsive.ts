// Mirror of @tumaet/apollon's MOBILE_VIEW_QUERY (the library's curated public
// surface doesn't re-export it). Keep both copies in sync.
export const MOBILE_VIEW_QUERY =
  "(max-width: 767.95px), (max-width: 950px) and (max-height: 500px)"

// Width-only "narrow" breakpoint (portrait phones). Unlike MOBILE_VIEW_QUERY it
// does NOT match phone-landscape — landscape is wide enough for the full desktop
// action set (just shorter), so it should keep all controls, not collapse to the
// compact pills. Used by the editor header to pick pills vs. the full island bar.
export const NARROW_VIEW_QUERY = "(max-width: 767.95px)"
