package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class RoundTripValidatorTest {
    private fun modelFor(diagram: PumlDiagram): JsonObject = ApollonModelMapper.toApollonModel(diagram, null, "t").model

    @Test
    fun `a candidate that reparses to the same classes and relations passes`() {
        val diagram =
            PumlDiagram(
                null,
                listOf(PumlType("A", PumlKind.CLASS, emptyList(), emptyList(), "class"), PumlType("B", PumlKind.CLASS, emptyList(), emptyList(), "class")),
                listOf(PumlRelation("A", "B", PumlRelationKind.UNIDIRECTIONAL, arrowToken = "-->")),
            )
        val model = modelFor(diagram)
        val candidate = "@startuml\nclass A\nclass B\nA --> B\n@enduml\n"
        assertNull(RoundTripValidator.validate(candidate, model))
    }

    @Test
    fun `missing @startuml or @enduml fails immediately`() {
        val model = modelFor(PumlDiagram(null, listOf(PumlType("A", PumlKind.CLASS, emptyList(), emptyList(), "class")), emptyList()))
        assertNotNull(RoundTripValidator.validate("class A", model))
    }

    @Test
    fun `a candidate missing a class the model has fails`() {
        val model = modelFor(PumlDiagram(null, listOf(PumlType("A", PumlKind.CLASS, emptyList(), emptyList(), "class"), PumlType("B", PumlKind.CLASS, emptyList(), emptyList(), "class")), emptyList()))
        val candidate = "@startuml\nclass A\n@enduml\n"
        assertNotNull(RoundTripValidator.validate(candidate, model))
    }

    @Test
    fun `a candidate with a different relation count fails`() {
        val diagram = PumlDiagram(null, listOf(PumlType("A", PumlKind.CLASS, emptyList(), emptyList(), "class"), PumlType("B", PumlKind.CLASS, emptyList(), emptyList(), "class")), listOf(PumlRelation("A", "B", PumlRelationKind.UNIDIRECTIONAL, arrowToken = "-->")))
        val model = modelFor(diagram)
        val candidate = "@startuml\nclass A\nclass B\n@enduml\n"
        assertNotNull(RoundTripValidator.validate(candidate, model))
    }

    @Test
    fun `a candidate that fails to re-parse (e g becomes a non-class diagram) fails validation`() {
        val model = modelFor(PumlDiagram(null, listOf(PumlType("A", PumlKind.CLASS, emptyList(), emptyList(), "class")), emptyList()))
        val candidate = "@startuml\nactor A\n@enduml\n"
        assertNotNull(RoundTripValidator.validate(candidate, model))
    }

    @Test
    fun `equal relation counts with different multisets still fail`() {
        // Two A->B dependency relations vs. one A->B and one B->A: same count, different signature.
        val diagram =
            PumlDiagram(
                null,
                listOf(PumlType("A", PumlKind.CLASS, emptyList(), emptyList(), "class"), PumlType("B", PumlKind.CLASS, emptyList(), emptyList(), "class")),
                listOf(
                    PumlRelation("A", "B", PumlRelationKind.DEPENDENCY, arrowToken = "..>"),
                    PumlRelation("A", "B", PumlRelationKind.DEPENDENCY, arrowToken = "..>"),
                ),
            )
        val model = modelFor(diagram)
        val candidate = "@startuml\nclass A\nclass B\nA ..> B\nB ..> A\n@enduml\n"
        assertEquals(
            "expected mismatch to be reported",
            true,
            RoundTripValidator.validate(candidate, model) != null,
        )
    }
}
