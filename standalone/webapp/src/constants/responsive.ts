// Width-only "narrow" breakpoint (portrait phones). Unlike a full mobile query it
// does NOT match phone-landscape — landscape is wide enough for the full desktop
// action set (just shorter), so it should keep all controls, not collapse to the
// compact pills. Used by the editor header to pick pills vs. the full island bar.
export const NARROW_VIEW_QUERY = "(max-width: 767.95px)"
