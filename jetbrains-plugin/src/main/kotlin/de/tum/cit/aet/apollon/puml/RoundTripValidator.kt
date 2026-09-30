package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonObject

/**
 * The gate a candidate `.puml` rewrite must pass before Architect Studio ever touches the real
 * source file (plan §A9 / spec §12): re-parse it and check the result still agrees with the
 * model it was generated from. A failure means the exporter and the model have drifted —
 * something this converter does not understand well enough to trust — so the caller must refuse
 * the write rather than risk a lossy rewrite.
 *
 * Dispatches on the Apollon model's own `type` field (plan §9) — each family importer/mapper pair
 * is re-verified with its own grammar rather than through one generic re-parse, the same
 * "kept in sync by hand, not refactored into one shared abstraction" choice
 * [PumlRelationGrammar]'s doc comment explains for the parsing side.
 */
object RoundTripValidator {
    /**
     * [residual] is what the candidate was generated *from*, and is only consulted where the model
     * alone cannot say whether something was lost — an activity diagram's `partition` brackets, which
     * exist in the file and nowhere on the canvas. Callers that have it should pass it.
     */
    fun validate(
        candidate: String,
        model: JsonObject,
        residual: PumlResidual? = null,
    ): String? {
        if (!candidate.contains("@startuml") || !candidate.contains("@enduml")) {
            return "the generated PlantUML is missing @startuml/@enduml"
        }
        // C4 shares Apollon's `DeploymentDiagram` type, so the model cannot say which grammar to
        // re-read the candidate with. The candidate itself can: a C4 include or macro call is
        // unmistakable, which is the same evidence the importer used on the way in.
        if (DiagramTypeDetector.detect(candidate) == DiagramFamily.C4) return validateC4(candidate, model)
        return when (textOf(model["type"])) {
            "ActivityDiagram" -> validateActivity(candidate, model, residual)
            "CommunicationDiagram" -> validateSequence(candidate, model)
            "ObjectDiagram" -> validateObject(candidate, model)
            "UseCaseDiagram" -> validateUseCase(candidate, model)
            "ComponentDiagram" -> validateComponent(candidate, model)
            "DeploymentDiagram" -> validateDeployment(candidate, model)
            else -> validateClass(candidate, model)
        }
    }

    private fun validateClass(
        candidate: String,
        model: JsonObject,
    ): String? {
        val reparsed = PlantUmlImporter.parse(candidate)
        if (reparsed is PumlParseResult.Rejected) return "the generated PlantUML failed to re-parse: ${reparsed.reason}"
        reparsed as PumlParseResult.Parsed

        val expected = ApollonModelMapper.signature(model)
        // Packages are elements on the canvas but live in their own list once parsed, so they have
        // to be folded back in here or every diagram containing one would look like it lost a class.
        val actualNames = (reparsed.diagram.types.map { it.name } + reparsed.diagram.packages.map { it.name }).toSet()
        if (actualNames != expected.names) {
            return "the generated PlantUML's classes do not match the diagram (expected ${expected.names}, got $actualNames)"
        }
        // Members are compared as an ordered list, not a set: reordering a class body is a change
        // the canvas cannot express, so a candidate that does it has drifted from the model even
        // though nothing was lost.
        reparsed.diagram.types.forEach { type ->
            val actual = ApollonModelMapper.memberLines(type)
            val want = expected.members[type.name] ?: return@forEach
            if (actual != want) {
                return "the generated PlantUML's members of \"${type.name}\" do not match the diagram (expected $want, got $actual)"
            }
        }
        // A relation line names a type by its alias where it has one, so the endpoints have to be
        // translated back to display names before they can be compared with the model's.
        val displayNameByRefId = reparsed.diagram.types.associate { it.refId to it.name }
        val actualRelations =
            reparsed.diagram.relations.map {
                Triple(
                    displayNameByRefId[it.sourceName] ?: it.sourceName,
                    displayNameByRefId[it.targetName] ?: it.targetName,
                    ApollonModelMapper.apollonEdgeType(it.kind),
                )
            }
        return compareMultisets(expected.relations, actualRelations)
    }

    private fun validateC4(
        candidate: String,
        model: JsonObject,
    ): String? {
        val reparsed = PlantUmlC4Importer.parse(candidate)
        if (reparsed is PumlC4ParseResult.Rejected) return "the generated PlantUML failed to re-parse: ${reparsed.reason}"
        reparsed as PumlC4ParseResult.Parsed

        val (expectedNames, expectedRelations) = C4ModelMapper.signature(model)
        val actualNames = reparsed.diagram.elements.map { it.displayName }.toSet()
        if (actualNames != expectedNames) {
            return "the generated PlantUML's C4 elements do not match the diagram (expected $expectedNames, got $actualNames)"
        }
        detailRefusal(model, reparsed.diagram)?.let { return it }
        val nameByRefId = reparsed.diagram.elements.associate { it.refId to it.displayName }
        val actualRelations =
            reparsed.diagram.relations.mapNotNull { rel ->
                val src = nameByRefId[rel.sourceRefId] ?: return@mapNotNull null
                val tgt = nameByRefId[rel.targetRefId] ?: return@mapNotNull null
                val type = if (rel.kind == C4RelationKind.BIDIRECTIONAL) "DeploymentAssociation" else "DeploymentDependency"
                Triple(src, tgt, type)
            }
        return compareMultisets(expectedRelations, actualRelations)
    }

    /**
     * Activity is checked by shape rather than by name, because most of an activity diagram has no
     * name: a lost `stop`, merge diamond or join bar would sail straight through the element-name
     * comparison every other family uses. Steps are compared as kind+label and flows as pairs of
     * those, which is exactly what [PlantUmlActivityExporter] can silently drop when a canvas graph
     * turns out not to be expressible as a structured program.
     *
     * The other half of the check has no counterpart in any other family: an activity source also
     * carries swimlanes, notes and `partition` brackets that live in [PumlResidual] rather than in
     * the model, so nothing above would notice their going. They are compared against the residual
     * the candidate was written from — see [preservationRefusal].
     */
    private fun validateActivity(
        candidate: String,
        model: JsonObject,
        residual: PumlResidual?,
    ): String? {
        noteRefusal(model, "an activity diagram")?.let { return it }

        val reparsed = PlantUmlActivityImporter.parse(candidate)
        if (reparsed is PumlActivityParseResult.Rejected) return "the generated PlantUML failed to re-parse: ${reparsed.reason}"
        reparsed as PumlActivityParseResult.Parsed

        val (expectedSteps, expectedFlows) = ActivityModelMapper.signature(model)
        val (actualSteps, actualFlows) = ActivityModelMapper.signatureOf(reparsed.diagram)
        if (actualSteps != expectedSteps) {
            return "the generated PlantUML's activity steps do not match the diagram (expected $expectedSteps, got $actualSteps)"
        }
        if (actualFlows != expectedFlows) {
            return "the generated PlantUML's control flows do not match the diagram (expected $expectedFlows, got $actualFlows)"
        }
        return preservationRefusal(residual, reparsed.residual)
    }

    /**
     * Everything an activity source says that the canvas never held has to still be there.
     *
     * Decoration is compared as a multiset of lines rather than in order, because the exporter is
     * allowed to move a line whose own step was deleted — it flushes with the next surviving step —
     * but is never allowed to lose one. A `partition` is compared by its opening line: unlike a
     * stray line it is a bracket, and the one case the exporter cannot write it back at all is when
     * every step inside was deleted, which the user has to resolve in the Text tab.
     */
    private fun preservationRefusal(
        before: PumlResidual?,
        after: PumlResidual,
    ): String? {
        if (before == null) return null
        fun lines(residual: PumlResidual) =
            residual.activityAnchors.values.flatMap { it.split("\n") }.filter { it.isNotBlank() }.groupingBy { it }.eachCount()
        if (lines(before) != lines(after)) {
            val lost = lines(before).keys - lines(after).keys
            return "the generated PlantUML lost ${lost.firstOrNull()?.let { "\"$it\"" } ?: "a line it cannot draw"}"
        }
        val kept = after.activitySpans.map { it.open }.groupingBy { it }.eachCount().toMutableMap()
        before.activitySpans.forEach { span ->
            val remaining = kept[span.open] ?: 0
            if (remaining > 0) {
                kept[span.open] = remaining - 1
                return@forEach
            }
            return "every step inside \"${span.open}\" was deleted, and PlantUML has no empty one — " +
                "remove it in the Text tab, or undo the deletion"
        }
        return null
    }

    /**
     * Sequence is the one family whose message *order* is part of the signature. Everywhere else a
     * relationship multiset is enough, but an interaction whose messages come back in a different
     * order is a different interaction, and that order survives the canvas only as the numbers on
     * the messages — so a renumbering bug has to be caught here rather than shipped.
     */
    private fun validateSequence(
        candidate: String,
        model: JsonObject,
    ): String? {
        noteRefusal(model, "a sequence diagram")?.let { return it }

        val reparsed = PlantUmlSequenceImporter.parse(candidate)
        if (reparsed is PumlSequenceParseResult.Rejected) return "the generated PlantUML failed to re-parse: ${reparsed.reason}"
        reparsed as PumlSequenceParseResult.Parsed

        val (expectedNames, expectedMessages) = SequenceModelMapper.signature(model)
        val actualNames = reparsed.diagram.participants.map { it.displayName }.toSet()
        if (actualNames != expectedNames) {
            return "the generated PlantUML's participants do not match the diagram (expected $expectedNames, got $actualNames)"
        }
        val nameByRefId = reparsed.diagram.participants.associate { it.refId to it.displayName }
        val actualMessages =
            reparsed.diagram.messages.map { message ->
                Triple(
                    nameByRefId[message.sourceRefId] ?: message.sourceRefId,
                    nameByRefId[message.targetRefId] ?: message.targetRefId,
                    message.text,
                )
            }
        if (actualMessages != expectedMessages) {
            return "the generated PlantUML's messages do not match the diagram, or are in a different order"
        }
        return null
    }

    private fun validateObject(
        candidate: String,
        model: JsonObject,
    ): String? {
        val reparsed = PlantUmlObjectImporter.parse(candidate)
        if (reparsed is PumlObjectParseResult.Rejected) return "the generated PlantUML failed to re-parse: ${reparsed.reason}"
        reparsed as PumlObjectParseResult.Parsed

        val (expectedNames, expectedRelations) = ObjectModelMapper.signature(model)
        val actualNames = reparsed.diagram.objects.map { it.name }.toSet()
        if (actualNames != expectedNames) {
            return "the generated PlantUML's objects do not match the diagram (expected $expectedNames, got $actualNames)"
        }
        val actualRelations = reparsed.diagram.relations.map { Triple(it.sourceName, it.targetName, "ObjectLink") }
        return compareMultisets(expectedRelations, actualRelations)
    }

    private fun validateUseCase(
        candidate: String,
        model: JsonObject,
    ): String? {
        val reparsed = PlantUmlUseCaseImporter.parse(candidate)
        if (reparsed is PumlUseCaseParseResult.Rejected) return "the generated PlantUML failed to re-parse: ${reparsed.reason}"
        reparsed as PumlUseCaseParseResult.Parsed

        val (expectedNames, expectedRelations) = UseCaseModelMapper.signature(model)
        val actualNames = reparsed.diagram.elements.map { it.displayName }.toSet()
        if (actualNames != expectedNames) {
            return "the generated PlantUML's elements do not match the diagram (expected $expectedNames, got $actualNames)"
        }
        val refToName = reparsed.diagram.elements.associate { it.refId to it.displayName }
        val actualRelations =
            reparsed.diagram.relations.mapNotNull { rel ->
                val src = refToName[rel.sourceRefId] ?: return@mapNotNull null
                val tgt = refToName[rel.targetRefId] ?: return@mapNotNull null
                Triple(src, tgt, useCaseEdgeType(rel.kind))
            }
        return compareMultisets(expectedRelations, actualRelations)
    }

    private fun validateComponent(
        candidate: String,
        model: JsonObject,
    ): String? {
        val reparsed = PlantUmlComponentImporter.parse(candidate)
        if (reparsed is PumlComponentParseResult.Rejected) return "the generated PlantUML failed to re-parse: ${reparsed.reason}"
        reparsed as PumlComponentParseResult.Parsed

        val (expectedNames, expectedRelations) = ComponentModelMapper.signature(model)
        val actualNames = reparsed.diagram.elements.map { it.displayName }.toSet()
        if (actualNames != expectedNames) {
            return "the generated PlantUML's elements do not match the diagram (expected $expectedNames, got $actualNames)"
        }
        val refToName = reparsed.diagram.elements.associate { it.refId to it.displayName }
        val actualRelations =
            reparsed.diagram.relations.mapNotNull { rel ->
                val src = refToName[rel.sourceName] ?: return@mapNotNull null
                val tgt = refToName[rel.targetName] ?: return@mapNotNull null
                Triple(src, tgt, "ComponentDependency")
            }
        return compareMultisets(expectedRelations, actualRelations)
    }

    private fun validateDeployment(
        candidate: String,
        model: JsonObject,
    ): String? {
        describedRefusal(model)?.let { return it }

        val reparsed = PlantUmlDeploymentImporter.parse(candidate)
        if (reparsed is PumlDeploymentParseResult.Rejected) return "the generated PlantUML failed to re-parse: ${reparsed.reason}"
        reparsed as PumlDeploymentParseResult.Parsed

        val (expectedNames, expectedRelations) = DeploymentModelMapper.signature(model)
        val actualNames = reparsed.diagram.elements.map { it.displayName }.toSet()
        if (actualNames != expectedNames) {
            return "the generated PlantUML's elements do not match the diagram (expected $expectedNames, got $actualNames)"
        }
        val refToName = reparsed.diagram.elements.associate { it.refId to it.displayName }
        val actualRelations =
            reparsed.diagram.relations.mapNotNull { rel ->
                val src = refToName[rel.sourceRefId] ?: return@mapNotNull null
                val tgt = refToName[rel.targetRefId] ?: return@mapNotNull null
                val type = if (rel.kind == PumlDeploymentRelationKind.ASSOCIATION) "DeploymentAssociation" else "DeploymentDependency"
                Triple(src, tgt, type)
            }
        return compareMultisets(expectedRelations, actualRelations)
    }

    /**
     * Activity and sequence are the two families with no note syntax Architect Studio *writes* yet —
     * an activity note attaches to whatever precedes it rather than to a named element, and a
     * sequence note's position in the message stream is part of what it means, so neither has an
     * anchor a canvas note could name. A note already in the source is a different matter and is
     * preserved where it stood; this is only about one drawn on the canvas, which their exporters
     * leave off. So the save is refused and says why: a note that vanished quietly on the next save
     * would be the one kind of loss this whole gate exists to prevent.
     */
    private fun noteRefusal(
        model: JsonObject,
        family: String,
    ): String? {
        val notes = arrOf(model["nodes"]).count { textOf(it["type"]) == NOTE_NODE_TYPE }
        if (notes == 0) return null
        return "notes cannot be written into $family yet — delete the note from the canvas, " +
            "or add it in the Text tab instead"
    }

    /**
     * The technology marker and the description are the only two macro arguments the canvas edits,
     * so they are the only two a save can write into a macro with no slot for them — a
     * `System_Boundary` has no bracketed type argument, and a technology typed onto one would have
     * nowhere to go. Rather than teach the validator which macro each box was written as, this
     * reads the two values back off the candidate and compares: it catches the missing slot, and it
     * would also catch an argument written into the wrong index.
     */
    private fun detailRefusal(
        model: JsonObject,
        diagram: PumlC4Diagram,
    ): String? {
        val expected = C4ModelMapper.detailSignature(model)
        diagram.elements.forEach { element ->
            val spec = c4ArgSpecFor(element.macro)
            val actual = C4Slots.read(element.extras, spec.technology) to C4Slots.read(element.extras, spec.description)
            val wanted = expected[element.displayName] ?: return@forEach
            if (actual == wanted) return@forEach
            val what = if (actual.first != wanted.first) "technology" else "description"
            return "a ${element.macro} has no $what field in C4 — clear it on \"${element.displayName}\", " +
                "or write it in the Text tab instead"
        }

        // Every `Rel` spelling has a slot for both, so unlike an element this cannot fail for want
        // of somewhere to write to — it is here to catch the exporter dropping one.
        val nameByRefId = diagram.elements.associate { it.refId to it.displayName }
        val actualRelations =
            diagram.relations.mapNotNull { relation ->
                val source = nameByRefId[relation.sourceRefId] ?: return@mapNotNull null
                val target = nameByRefId[relation.targetRefId] ?: return@mapNotNull null
                val type = if (relation.kind == C4RelationKind.BIDIRECTIONAL) "DeploymentAssociation" else "DeploymentDependency"
                val spec = c4ArgSpecFor(relation.macro)
                listOf(
                    source,
                    target,
                    type,
                    C4Slots.read(relation.extras, spec.technology),
                    C4Slots.read(relation.extras, spec.description),
                )
            }.groupingBy { it }.eachCount()
        if (actualRelations != C4ModelMapper.relationDetailSignature(model)) {
            return "the generated PlantUML lost the technology or description of a relationship"
        }
        return null
    }

    /**
     * Plain PlantUML deployment syntax is `node "X" { component "Y" }` and has no third thing to say
     * about a box, so the technology and description Apollon can now show would vanish on save. C4
     * files take the same canvas elements and *do* have somewhere to keep them (see [detailRefusal]),
     * which is why this refusal is specific to the plain family rather than to the node types.
     */
    private fun describedRefusal(model: JsonObject): String? {
        fun isDescribed(element: JsonObject): Boolean {
            val data = objOf(element["data"]) ?: return false
            return !textOf(data["technology"]).isNullOrBlank() || !textOf(data["description"]).isNullOrBlank()
        }

        val nameById =
            arrOf(model["nodes"]).mapNotNull { node ->
                val id = textOf(node["id"]) ?: return@mapNotNull null
                id to textOf(objOf(node["data"])?.get("name")).orEmpty()
            }.toMap()
        val what =
            arrOf(model["nodes"]).firstOrNull(::isDescribed)?.let { "\"${textOf(objOf(it["data"])?.get("name")).orEmpty()}\"" }
                ?: arrOf(model["edges"]).firstOrNull(::isDescribed)?.let {
                    val source = nameById[textOf(it["source"])].orEmpty()
                    val target = nameById[textOf(it["target"])].orEmpty()
                    "the connection from \"$source\" to \"$target\""
                }
                ?: return null
        return "a PlantUML deployment diagram has nowhere to keep a technology or description — " +
            "clear them on $what, or attach a note instead"
    }

    private fun useCaseEdgeType(kind: PumlUseCaseRelationKind): String =
        when (kind) {
            PumlUseCaseRelationKind.ASSOCIATION -> "UseCaseAssociation"
            PumlUseCaseRelationKind.INCLUDE -> "UseCaseInclude"
            PumlUseCaseRelationKind.EXTEND -> "UseCaseExtend"
            PumlUseCaseRelationKind.GENERALIZATION -> "UseCaseGeneralization"
        }

    private fun compareMultisets(
        expected: List<Triple<String, String, String>>,
        actual: List<Triple<String, String, String>>,
    ): String? {
        val expectedMultiset = expected.groupingBy { it }.eachCount()
        val actualMultiset = actual.groupingBy { it }.eachCount()
        if (expectedMultiset != actualMultiset) {
            return "the generated PlantUML's relationships do not match the diagram"
        }
        return null
    }
}
