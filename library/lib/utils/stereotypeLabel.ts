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
