package de.tum.cit.aet.apollon.puml

/** File extensions Architect Studio treats as PlantUML source. `.iuml` is deliberately excluded:
 *  by convention it is an `!include` fragment with no `@startuml`, so "Edit" on one would import
 *  a partial diagram and rewrite it as a whole one. */
val PLANT_UML_EXTENSIONS = setOf("puml", "plantuml", "pu", "wsd")

fun isPlantUmlExtension(extension: String?): Boolean = extension != null && extension.lowercase() in PLANT_UML_EXTENSIONS

/** The four classifier kinds the Apollon canvas can render (see [PumlKind] to [ClassStereotype] mapping in ApollonModelMapper). */
enum class PumlKind { CLASS, ABSTRACT_CLASS, INTERFACE, ENUM, ENTITY }

enum class PumlRelationKind { INHERITANCE, REALIZATION, COMPOSITION, AGGREGATION, UNIDIRECTIONAL, BIDIRECTIONAL, DEPENDENCY }

/**
 * One attribute or method line. [apollonName] is already in Apollon's own free-text member
 * format (e.g. `"+ name: Type"`) — Apollon has no separate visibility/type fields, see
 * `library/lib/types/nodes/NodeProps.ts`. [isAbstract] is the one member-level fact Apollon
 * *does* model as a real field (methods only).
 */
data class PumlMember(
    val apollonName: String,
    val isMethod: Boolean,
    val isAbstract: Boolean,
)

data class PumlType(
    val name: String,
    val kind: PumlKind,
    val attributes: List<PumlMember>,
    val methods: List<PumlMember>,
    /** The exact source keyword (`"class"`, `"abstract class"`, `"abstract"`, `"interface"`, `"enum"`, `"entity"`). */
    val keyword: String,
    /** Enclosing `package` name, or `null` at the top level. */
    val parentName: String? = null,
    /** The source-level `as <alias>`. PlantUML only accepts one on a quoted display name
     *  (`class "Order Line" as OL`), and once a type has one, *that* is what relation lines and
     *  note anchors have to reference — hence [refId]. */
    val alias: String? = null,
    /** Every `<<stereotype>>` on the declaration, verbatim and including the angle brackets. The
     *  canvas has no field for a free-form stereotype (its own `stereotype` key is reserved for
     *  `interface`/`enumeration`), so this is carried rather than modelled. */
    val stereotype: String? = null,
    /** The lines between `{` and `}` exactly as written, trimmed of indentation. Kept so a save
     *  that did not touch this type's members reproduces its body byte for byte — member order,
     *  `--` separators, blank lines and each member's own spacing included. */
    val bodySource: List<String> = emptyList(),
) {
    /** What a relation line or note anchor names this type by: its alias if it has one, its
     *  display name otherwise. */
    val refId: String get() = alias ?: name
}

/** A `package Name { ... }` grouping — the class-diagram counterpart of the Component family's
 *  `package` subsystem, and the Apollon `package` node type. Holds no members of its own; what
 *  belongs to it is whichever [PumlType]s name it in [PumlType.parentName]. */
data class PumlPackage(val name: String)

/** [sourceName]/[targetName] are the names as a relation *line* spells them — a type's
 *  [PumlType.refId], which is its alias where it has one, not its display name. */
data class PumlRelation(
    val sourceName: String,
    val targetName: String,
    val kind: PumlRelationKind,
    val sourceMultiplicity: String = "",
    val sourceRole: String = "",
    val targetMultiplicity: String = "",
    val targetRole: String = "",
    /** Text after a trailing `: label` on the relation line. Carried, never rendered on a class edge. */
    val label: String = "",
    /** The exact arrow token from the source, e.g. `"-->"`, `"--->"`, `"<|.."`. */
    val arrowToken: String,
)

data class PumlDiagram(
    val name: String?,
    val types: List<PumlType>,
    val relations: List<PumlRelation>,
    val packages: List<PumlPackage> = emptyList(),
    val notes: List<PumlNote> = emptyList(),
)
