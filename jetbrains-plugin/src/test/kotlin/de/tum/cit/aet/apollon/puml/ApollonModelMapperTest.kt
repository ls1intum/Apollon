package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Test

class ApollonModelMapperTest {
    private fun nodesOf(model: JsonObject): List<JsonObject> = model["nodes"]!!.jsonArray.map { it.jsonObject }

    private fun edgesOf(model: JsonObject): List<JsonObject> = model["edges"]!!.jsonArray.map { it.jsonObject }

    private fun nodeNamed(
        model: JsonObject,
        name: String,
    ): JsonObject = nodesOf(model).single { it["data"]!!.jsonObject["name"]!!.jsonPrimitive.content == name }

    @Test
    fun `fresh import creates one node per type with the right stereotype fields`() {
        val diagram =
            PumlDiagram(
                null,
                listOf(
                    PumlType("Shape", PumlKind.INTERFACE, emptyList(), emptyList(), "interface"),
                    PumlType("Color", PumlKind.ENUM, emptyList(), emptyList(), "enum"),
                    PumlType("Animal", PumlKind.ABSTRACT_CLASS, emptyList(), emptyList(), "abstract class"),
                    PumlType("Dog", PumlKind.CLASS, emptyList(), emptyList(), "class"),
                ),
                emptyList(),
            )
        val mapped = ApollonModelMapper.toApollonModel(diagram, previous = null, title = "t")
        assertEquals("interface", nodeNamed(mapped.model, "Shape")["data"]!!.jsonObject["stereotype"]!!.jsonPrimitive.content)
        assertEquals("enumeration", nodeNamed(mapped.model, "Color")["data"]!!.jsonObject["stereotype"]!!.jsonPrimitive.content)
        assertEquals(true, nodeNamed(mapped.model, "Animal")["data"]!!.jsonObject["isAbstract"]!!.jsonPrimitive.boolean)
        assertFalse("stereotype" in nodeNamed(mapped.model, "Dog")["data"]!!.jsonObject)
    }

    @Test
    fun `a relation becomes an edge with the corresponding apollon type and multiplicities`() {
        val diagram =
            PumlDiagram(
                null,
                listOf(PumlType("Customer", PumlKind.CLASS, emptyList(), emptyList(), "class"), PumlType("Order", PumlKind.CLASS, emptyList(), emptyList(), "class")),
                listOf(PumlRelation("Customer", "Order", PumlRelationKind.UNIDIRECTIONAL, sourceMultiplicity = "1", targetMultiplicity = "*", arrowToken = "-->")),
            )
        val mapped = ApollonModelMapper.toApollonModel(diagram, previous = null, title = "t")
        val edge = edgesOf(mapped.model).single()
        assertEquals("ClassUnidirectional", edge["type"]!!.jsonPrimitive.content)
        assertEquals("1", edge["data"]!!.jsonObject["sourceMultiplicity"]!!.jsonPrimitive.content)
        assertEquals("*", edge["data"]!!.jsonObject["targetMultiplicity"]!!.jsonPrimitive.content)
    }

    @Test
    fun `re-import keeps an unchanged type's node id and position`() {
        val diagram = PumlDiagram(null, listOf(PumlType("Customer", PumlKind.CLASS, emptyList(), emptyList(), "class")), emptyList())
        val first = ApollonModelMapper.toApollonModel(diagram, previous = null, title = "t")
        val firstNode = nodeNamed(first.model, "Customer")
        val firstId = firstNode["id"]!!.jsonPrimitive.content
        val firstPosition = firstNode["position"]!!.jsonObject

        val second = ApollonModelMapper.toApollonModel(diagram, previous = first.model, title = "t")
        val secondNode = nodeNamed(second.model, "Customer")
        assertEquals(firstId, secondNode["id"]!!.jsonPrimitive.content)
        assertEquals(firstPosition, secondNode["position"]!!.jsonObject)
    }

    @Test
    fun `re-import gives a brand new type its own id distinct from existing ones`() {
        val first = ApollonModelMapper.toApollonModel(PumlDiagram(null, listOf(PumlType("A", PumlKind.CLASS, emptyList(), emptyList(), "class")), emptyList()), null, "t")
        val diagramWithB =
            PumlDiagram(null, listOf(PumlType("A", PumlKind.CLASS, emptyList(), emptyList(), "class"), PumlType("B", PumlKind.CLASS, emptyList(), emptyList(), "class")), emptyList())
        val second = ApollonModelMapper.toApollonModel(diagramWithB, first.model, "t")
        val idA = nodeNamed(second.model, "A")["id"]!!.jsonPrimitive.content
        val idB = nodeNamed(second.model, "B")["id"]!!.jsonPrimitive.content
        assertEquals(nodeNamed(first.model, "A")["id"]!!.jsonPrimitive.content, idA)
        assertNotEquals(idA, idB)
    }

    @Test
    fun `toPumlDiagram round-trips names and keywords, and prunes maps to current ids`() {
        val diagram = PumlDiagram(null, listOf(PumlType("Customer", PumlKind.CLASS, emptyList(), emptyList(), "class")), emptyList())
        val mapped = ApollonModelMapper.toApollonModel(diagram, null, "t")
        val nodeId = nodeNamed(mapped.model, "Customer")["id"]!!.jsonPrimitive.content

        val residualWithStaleEntry = PumlResidual.empty().copy(typeKeywords = mapOf(nodeId to "class", "deleted-id" to "entity"))
        val export = ApollonModelMapper.toPumlDiagram(mapped.model, residualWithStaleEntry)
        assertEquals("Customer", export.diagram.types.single().name)
        assertEquals("class", export.diagram.types.single().keyword)
        assertEquals(setOf(nodeId), export.typeKeywords.keys)
    }

    @Test
    fun `signature reflects the model's current classifiers and relation triples`() {
        val diagram =
            PumlDiagram(
                null,
                listOf(PumlType("A", PumlKind.CLASS, emptyList(), emptyList(), "class"), PumlType("B", PumlKind.CLASS, emptyList(), emptyList(), "class")),
                listOf(PumlRelation("A", "B", PumlRelationKind.DEPENDENCY, arrowToken = "..>")),
            )
        val mapped = ApollonModelMapper.toApollonModel(diagram, null, "t")
        val signature = ApollonModelMapper.signature(mapped.model)
        assertEquals(setOf("A", "B"), signature.names)
        assertEquals(listOf(Triple("A", "B", "ClassDependency")), signature.relations)
    }

    /** A dropped or reordered member used to pass the round-trip gate untouched: the signature
     *  compared classifier names and relations only. */
    @Test
    fun `signature carries each classifier's members, in canvas order`() {
        val diagram =
            PumlDiagram(
                null,
                listOf(
                    PumlType(
                        "A",
                        PumlKind.CLASS,
                        listOf(PumlMember("- id: Long", isMethod = false, isAbstract = false)),
                        listOf(PumlMember("+ save()", isMethod = true, isAbstract = false)),
                        "class",
                    ),
                ),
                emptyList(),
            )
        val mapped = ApollonModelMapper.toApollonModel(diagram, null, "t")
        assertEquals(mapOf("A" to listOf("- id: Long", "+ save()")), ApollonModelMapper.signature(mapped.model).members)
    }
}
