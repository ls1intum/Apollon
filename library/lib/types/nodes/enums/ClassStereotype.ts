/**
 * UML class-diagram metaclass keywords, rendered in guillemets above the class
 * name (e.g. `«interface»`). These are keywords denoting a distinct metaclass —
 * NOT modifiers. Abstractness is a separate boolean (`isAbstract`), shown by an
 * italic name, per UML 2.5.1 §9.2.4; there is no `«abstract»` keyword.
 *
 * Values are the serialized, already-lowercase spelling from the UML keyword
 * table (UML 2.5.1 Annex C, Table C.1), so the stored value equals what renders.
 */
export enum ClassStereotype {
  Interface = "interface",
  Enumeration = "enumeration",
}
