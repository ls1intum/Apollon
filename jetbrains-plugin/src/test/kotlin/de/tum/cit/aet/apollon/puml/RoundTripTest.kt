package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** The spec's worked example: a `Customer`/`Order` class diagram with an association — exercised
 *  as `puml -> model -> puml` (spec §11: deterministic, no edit means no diff) and
 *  `puml -> model -> edit -> puml` (spec §7/§18: a canvas edit must appear in the rewritten file). */
class RoundTripTest {
    private val customerPuml =
        """
        @startuml
        class Customer {
          -name : String
          +placeOrder()
        }
        class Order
        Customer "1" --> "*" Order
        @enduml

        """.trimIndent() + "\n"

    private data class Exported(val model: JsonObject, val text: String)

    private fun importAndExport(
        source: String,
        edit: (JsonObject) -> JsonObject = { it },
    ): Exported {
        val parsed = PlantUmlImporter.parse(source) as PumlParseResult.Parsed
        val mapped = ApollonModelMapper.toApollonModel(parsed.diagram, null, "customer")
        val residual = parsed.residual.copy(typeKeywords = mapped.typeKeywords, arrowTokens = mapped.arrowTokens)
        val editedModel = edit(mapped.model)
        val export = ApollonModelMapper.toPumlDiagram(editedModel, residual)
        val prunedResidual = residual.copy(typeKeywords = export.typeKeywords, arrowTokens = export.arrowTokens)
        return Exported(editedModel, PlantUmlExporter.render(export.diagram, prunedResidual))
    }

    @Test
    fun `unedited import-then-export reparses to the same classes and relation count`() {
        val parsed = PlantUmlImporter.parse(customerPuml) as PumlParseResult.Parsed
        val exported = importAndExport(customerPuml)
        val reparsed = PlantUmlImporter.parse(exported.text) as PumlParseResult.Parsed

        assertEquals(parsed.diagram.types.map { it.name }.toSet(), reparsed.diagram.types.map { it.name }.toSet())
        assertEquals(parsed.diagram.relations.size, reparsed.diagram.relations.size)
        assertEquals(0, reparsed.unsupportedCount)
    }

    @Test
    fun `re-exporting an unedited model twice produces byte-identical PlantUML`() {
        val a = importAndExport(customerPuml)
        val b = importAndExport(customerPuml)
        assertEquals(a.text, b.text)
    }

    @Test
    fun `a canvas edit to a member appears in the regenerated PlantUML and survives another parse`() {
        val exported = importAndExport(customerPuml, edit = ::addEmailAttributeToCustomer)
        assertTrue(exported.text.contains("email"))

        val reparsed = PlantUmlImporter.parse(exported.text) as PumlParseResult.Parsed
        val customer = reparsed.diagram.types.single { it.name == "Customer" }
        assertTrue(customer.attributes.any { it.apollonName.contains("email") })
        // The untouched members and relation are still exactly what they were.
        assertTrue(customer.attributes.any { it.apollonName.contains("name") })
        assertEquals(1, reparsed.diagram.relations.size)
    }

    private fun addEmailAttributeToCustomer(model: JsonObject): JsonObject {
        val newNodes =
            model["nodes"]!!.jsonArray.map { nodeElement ->
                val node = nodeElement.jsonObject
                val data = node["data"]!!.jsonObject
                if (data["name"]!!.jsonPrimitive.content != "Customer") return@map node
                val newAttributes =
                    buildJsonArray {
                        data["attributes"]!!.jsonArray.forEach { add(it) }
                        add(
                            buildJsonObject {
                                put("id", "test-new-attribute")
                                put("name", "+ email: String")
                            },
                        )
                    }
                val newData = JsonObject(data.toMutableMap().apply { put("attributes", newAttributes) })
                JsonObject(node.toMutableMap().apply { put("data", newData) })
            }
        return JsonObject(model.toMutableMap().apply { put("nodes", JsonArray(newNodes)) })
    }
}
