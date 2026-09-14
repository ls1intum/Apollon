package de.tum.cit.aet.apollon.puml

/**
 * The C4 abstractions Architect Studio puts on the canvas, collapsed from C4-PlantUML's ~30
 * element macros to the six shapes that actually differ.
 *
 * The distinctions the macros make *within* a kind — `_Ext` (someone else's), `Db`, `Queue` — are
 * styling, not structure: the same box with a different fill or icon. Collapsing them here and
 * remembering the exact macro name per element (see [PumlC4Element.macro]) means the canvas gets
 * one shape per idea while the file keeps the macro the author wrote.
 */
enum class C4Kind { PERSON, SYSTEM, CONTAINER, COMPONENT, BOUNDARY, NODE }

/**
 * One C4 element — a `Person(...)`, `Container(...)`, `System_Boundary(...) { ... }`, ….
 *
 * [refId] is the macro's first argument, the alias every `Rel(...)` line refers to, so it plays
 * exactly the part `as <alias>` plays in the UseCase/Component/Deployment families. [extras] is
 * every argument after the label, verbatim and unparsed, and rides through [PumlResidual] the way
 * `typeKeywords` carries a class's exact source keyword.
 *
 * Two of those arguments are not only preserved but editable: the bracketed technology marker and
 * the description are read out at [C4ModelMapper] via [c4ArgSpecFor] and shown on the box. The rest
 * — `$sprite`, `$tags`, `$link` — have no field on an Apollon deployment node, so they stay in the
 * residual and the Text tab is where you change them.
 */
data class PumlC4Element(
    val refId: String,
    val displayName: String,
    val kind: C4Kind,
    val macro: String,
    val extras: List<String> = emptyList(),
    val parentRefId: String? = null,
)

/** `Rel`-family macros collapse to the two edges Apollon's deployment palette draws: a dependency
 *  (one-way) and an association (both ways). */
enum class C4RelationKind { DIRECTED, BIDIRECTIONAL }

data class PumlC4Relation(
    val sourceRefId: String,
    val targetRefId: String,
    val kind: C4RelationKind,
    /** The exact macro, e.g. `Rel`, `Rel_Back_U`, `BiRel_L` — direction hints are layout, so they
     *  are kept as written rather than recomputed from where the boxes ended up. */
    val macro: String,
    val label: String = "",
    val extras: List<String> = emptyList(),
)

data class PumlC4Diagram(
    val name: String?,
    val elements: List<PumlC4Element>,
    val relations: List<PumlC4Relation>,
    val notes: List<PumlNote> = emptyList(),
)

/** `Macro(args)` or `Macro(args) {` — the whole of C4-PlantUML's surface syntax. */
val C4_MACRO_CALL = Regex("""^([A-Za-z_]\w*)\s*\((.*)\)\s*(\{)?\s*$""")

/** `Boundary_End()` — the brace-free way to close a boundary opened with `Boundary_Start`-style
 *  macros. Accepted so a file written that way still nests correctly. */
val C4_BOUNDARY_END = Regex("""^Boundary_End\s*\(\s*\)\s*$""")

/** Macro name -> the kind it declares. Case-sensitive: C4-PlantUML's macros are, and a lowercase
 *  `component`/`node` is the plain UML keyword belonging to a different family's importer. */
val C4_ELEMENT_MACROS: Map<String, C4Kind> =
    buildMap {
        listOf("Person", "Person_Ext").forEach { put(it, C4Kind.PERSON) }
        listOf(
            "System", "System_Ext", "SystemDb", "SystemDb_Ext", "SystemQueue", "SystemQueue_Ext",
        ).forEach { put(it, C4Kind.SYSTEM) }
        listOf(
            "Container", "Container_Ext", "ContainerDb", "ContainerDb_Ext", "ContainerQueue", "ContainerQueue_Ext",
        ).forEach { put(it, C4Kind.CONTAINER) }
        listOf(
            "Component", "Component_Ext", "ComponentDb", "ComponentDb_Ext", "ComponentQueue", "ComponentQueue_Ext",
        ).forEach { put(it, C4Kind.COMPONENT) }
        listOf(
            "Boundary", "System_Boundary", "Container_Boundary", "Enterprise_Boundary",
        ).forEach { put(it, C4Kind.BOUNDARY) }
        listOf("Node", "Node_L", "Node_R", "Deployment_Node").forEach { put(it, C4Kind.NODE) }
    }

/** `Rel`, `Rel_Back_U`, `BiRel_L`, `Rel_Neighbor`, … — one shape covering the whole family rather
 *  than a list that goes stale the next time C4-PlantUML adds a direction suffix. */
val C4_RELATION_MACRO = Regex("""^(BiRel|Rel)(_Back)?(_(Neighbor|U|D|L|R|Up|Down|Left|Right))?$""")

fun c4RelationKindOf(macro: String): C4RelationKind? {
    val match = C4_RELATION_MACRO.find(macro) ?: return null
    return if (match.groupValues[1] == "BiRel") C4RelationKind.BIDIRECTIONAL else C4RelationKind.DIRECTED
}

/**
 * One macro argument the canvas can edit: where it sits in the positional argument list, and the
 * name it answers to in C4's named-argument form (`$techn="Kotlin"`).
 */
data class C4ArgSlot(val index: Int, val param: String)

/**
 * The two arguments Apollon draws: [technology] is the bracketed marker under the name, and
 * [description] the sentence below it. Either may be `null` for a macro that has no such argument.
 */
data class C4ArgSpec(val technology: C4ArgSlot?, val description: C4ArgSlot?)

private val C4_TYPE_LAST = C4ArgSpec(C4ArgSlot(4, "type"), C4ArgSlot(0, "descr"))
private val C4_TECHN_FIRST = C4ArgSpec(C4ArgSlot(0, "techn"), C4ArgSlot(1, "descr"))
private val C4_TYPE_FIRST = C4ArgSpec(C4ArgSlot(0, "type"), C4ArgSlot(1, "descr"))
private val C4_NO_TECHNOLOGY = C4ArgSpec(null, C4ArgSlot(2, "descr"))

/**
 * Where each macro keeps its technology and description arguments.
 *
 * The indices are not guessable and not uniform — `Person` puts its description first and its
 * bracketed `type` fifth, `Container` is the other way round, and `Boundary` keeps a description at
 * index 3 while `System_Boundary` keeps it at 2. They were read off the C4 stdlib bundled with the
 * PlantUML build this plugin ships, by rendering one macro per slot and seeing which argument came
 * out where; `C4RoundTripTest` pins the result so a stdlib bump that reorders an argument list
 * fails a test rather than quietly writing a description into a sprite.
 */
private val C4_ARG_SPECS: Map<String, C4ArgSpec> =
    buildMap {
        listOf(
            "Person", "Person_Ext",
            "System", "System_Ext", "SystemDb", "SystemDb_Ext", "SystemQueue", "SystemQueue_Ext",
        ).forEach { put(it, C4_TYPE_LAST) }
        listOf(
            "Container", "Container_Ext", "ContainerDb", "ContainerDb_Ext", "ContainerQueue", "ContainerQueue_Ext",
            "Component", "Component_Ext", "ComponentDb", "ComponentDb_Ext", "ComponentQueue", "ComponentQueue_Ext",
        ).forEach { put(it, C4_TECHN_FIRST) }
        listOf("Node", "Node_L", "Node_R", "Deployment_Node").forEach { put(it, C4_TYPE_FIRST) }
        // `Boundary`'s description trails its tags and link; its three specialisations drop the
        // bracketed type argument altogether, which is why they cannot carry a technology at all.
        put("Boundary", C4ArgSpec(C4ArgSlot(0, "type"), C4ArgSlot(3, "descr")))
        listOf("System_Boundary", "Container_Boundary", "Enterprise_Boundary").forEach { put(it, C4_NO_TECHNOLOGY) }
    }

/** Every `Rel`/`BiRel` spelling shares one signature, so the relation family is matched rather than
 *  listed — the same reason [C4_RELATION_MACRO] is a regex. */
fun c4ArgSpecFor(macro: String): C4ArgSpec =
    C4_ARG_SPECS[macro] ?: if (C4_RELATION_MACRO.matches(macro)) C4_TECHN_FIRST else C4ArgSpec(null, null)

private val C4_NAMED_ARG = Regex("""^\$(\w+)\s*=\s*(.*)$""")

/**
 * Reads and writes a single named argument inside a macro's trailing argument list.
 *
 * The list is kept verbatim in [PumlResidual.c4Extras] and mostly consists of things the canvas has
 * no field for (`$sprite`, `$tags`, `$link`), so these have to reach in and change one argument
 * without disturbing the rest. Two forms are understood, because C4 accepts both: positional, and
 * named (`$descr="..."`). An argument is written back in the form it was read in, and a value the
 * file did not previously carry is appended in the *named* form rather than padded up to its
 * positional slot — named arguments do not care what index they sit at, so a C4 stdlib that grows a
 * parameter cannot silently shift a freshly typed description into the wrong one.
 */
object C4Slots {
    /** An argument the file has to keep writing because a later one depends on its position.
     *  C4 reads it as absent, which is what an emptied field means. */
    private const val HOLE = "\"\""

    private fun isBlankArg(arg: String) = arg.isEmpty() || arg == HOLE

    /** Args before the first named one; positional indices are only meaningful within these. */
    private fun positionalCount(extras: List<String>): Int =
        extras.indexOfFirst { C4_NAMED_ARG.matches(it) }.let { if (it < 0) extras.size else it }

    private fun namedIndex(
        extras: List<String>,
        param: String,
    ): Int = extras.indexOfFirst { C4_NAMED_ARG.find(it)?.groupValues?.get(1) == param }

    fun read(
        extras: List<String>,
        slot: C4ArgSlot?,
    ): String {
        if (slot == null) return ""
        val named = namedIndex(extras, slot.param)
        if (named >= 0) return C4Args.unquote(C4_NAMED_ARG.find(extras[named])!!.groupValues[2].trim())
        if (slot.index >= positionalCount(extras)) return ""
        return C4Args.unquote(extras[slot.index])
    }

    fun write(
        extras: List<String>,
        slot: C4ArgSlot?,
        value: String,
    ): List<String> {
        if (slot == null) return extras
        val named = namedIndex(extras, slot.param)
        if (named >= 0) {
            if (value.isEmpty()) return extras.filterIndexed { i, _ -> i != named }
            return extras.toMutableList().also { it[named] = "\$${slot.param}=${C4Args.quote(value)}" }
        }
        // Past the last positional argument the file actually wrote, so filling the slot
        // positionally would mean padding the gap with empty strings whose meaning depends on the
        // stdlib's parameter order. The named form does not care what index it lands on.
        if (slot.index > positionalCount(extras)) {
            return if (value.isEmpty()) extras else extras + "\$${slot.param}=${C4Args.quote(value)}"
        }
        val updated = extras.toMutableList()
        if (slot.index == positionalCount(extras)) {
            if (value.isEmpty()) return extras
            updated.add(slot.index, C4Args.quote(value))
        } else {
            updated[slot.index] = if (value.isEmpty()) HOLE else C4Args.quote(value)
        }
        // A hole only earns its place when something after it still needs the position.
        return updated.dropLastWhile { isBlankArg(it) }
    }
}

/**
 * Splits a macro's argument list on the commas that separate arguments, leaving the ones inside a
 * quoted string or a nested call alone — `Rel(a, b, "reads, writes")` is three arguments, not four.
 */
object C4Args {
    fun split(raw: String): List<String> {
        val args = mutableListOf<String>()
        val current = StringBuilder()
        var quoted = false
        var depth = 0
        raw.forEach { char ->
            when {
                char == '"' -> {
                    quoted = !quoted
                    current.append(char)
                }
                quoted -> current.append(char)
                char == '(' || char == '[' -> {
                    depth++
                    current.append(char)
                }
                char == ')' || char == ']' -> {
                    depth--
                    current.append(char)
                }
                char == ',' && depth == 0 -> {
                    args += current.toString().trim()
                    current.setLength(0)
                }
                else -> current.append(char)
            }
        }
        val last = current.toString().trim()
        if (last.isNotEmpty() || args.isNotEmpty()) args += last
        return args
    }

    fun unquote(value: String): String =
        (if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) value.substring(1, value.length - 1) else value)
            .replace("\\n", "\n")

    /**
     * Labels always go out quoted. C4 accepts a bare word too, so this normalises the first save
     * of a hand-written file — and is then stable, because unquote/quote is idempotent.
     *
     * A line break has to become PlantUML's own `\n` escape rather than a real one. A macro call is
     * a single line: type a two-line description into the canvas and a real newline would split
     * `Container(frontend, …` in half, and the file would stop rendering entirely — not just lose
     * the description. `\n` is what PlantUML means by a line break inside a quoted label anyway, so
     * [unquote] reads it straight back and the round trip is lossless.
     */
    fun quote(value: String): String =
        "\"" + value.replace("\"", "'").replace("\r\n", "\n").replace('\r', '\n').replace("\n", "\\n") + "\""
}
