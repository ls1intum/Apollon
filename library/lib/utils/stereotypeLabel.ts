/**
 * Wraps a UML keyword/stereotype in guillemets for display, e.g. `interface` →
 * `«interface»`.
 *
 * Casing is fixed at the data layer, not here: class metaclass keywords are
 * stored lowercase (`ClassStereotype`), and the component/deployment stereotypes
 * (`"component"`, `"subsystem"`, `"node"`) are authored lowercase too. A
 * user-authored stereotype is rendered exactly as given. This helper only owns
 * the guillemet chrome so both class and component/deployment renderers stay in
 * sync.
 */
export const stereotypeLabel = (keyword: string): string => `«${keyword}»`

/**
 * Appends the UML `{abstract}` property annotation to a class name or a method
 * signature when it is abstract (UML 2.5.1 §9.2.4 / §9.4).
 *
 * We render abstract as an italic name in the editor, but the raster (resvg) and
 * PDF (jsPDF) export paths ship no italic face and strip the slant — so italic
 * alone would silently vanish on export. `{abstract}` is a text token that
 * survives every path (and is announced by screen readers), keeping the cue
 * unambiguous everywhere. This is the single source of the displayed string, so
 * width measurement and rendering never drift.
 */
export const withAbstractMarker = (
  name: string,
  isAbstract?: boolean
): string => (isAbstract ? `${name} {abstract}` : name)
