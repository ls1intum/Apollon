package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Names PlantUML cannot store used to strand a canvas edit: the export dropped the element, the
 * re-parse came back a class short, and [RoundTripValidator] refused the whole write — so the user
 * could not save anything else either until they undid it. Reported from a live session, where
 * renaming a class emptied its name.
 */
class PumlNameTest {
    @Test
    fun `an empty name becomes the fallback rather than an unwritable declaration`() {
        assertEquals(PumlName.FALLBACK, PumlName.forPuml(""))
        assertEquals(PumlName.FALLBACK, PumlName.forPuml(null))
    }

    @Test
    fun `a quote is folded, since PlantUML cannot escape one inside a quoted name`() {
        assertEquals("a'b", PumlName.forPuml("a\"b"))
    }

    @Test
    fun `a newline or tab is flattened, since a declaration is one line`() {
        assertEquals("a b", PumlName.forPuml("a\nb"))
        assertEquals("a b", PumlName.forPuml("a\r\nb"))
        assertEquals("a b", PumlName.forPuml("a\tb"))
    }

    /** Both survive a quoted declaration intact, so rewriting them would be a rename for nothing. */
    @Test
    fun `surrounding and all-over whitespace is left alone`() {
        assertEquals("trailing ", PumlName.forPuml("trailing "))
        assertEquals(" leading", PumlName.forPuml(" leading"))
        assertEquals("   ", PumlName.forPuml("   "))
    }

    private fun classModel(name: String): JsonObject =
        buildJsonObject {
            put("version", "4.0.0")
            put("id", "m")
            put("title", "t")
            put("type", "ClassDiagram")
            put(
                "nodes",
                JsonArray(
                    listOf("Keep", name).mapIndexed { i, n ->
                        buildJsonObject {
                            put("id", "n$i")
                            put("type", "class")
                            put("width", 200)
                            put("height", 100)
                            put("position", buildJsonObject { put("x", 0); put("y", 0) })
                            put(
                                "data",
                                buildJsonObject {
                                    put("name", n)
                                    put("attributes", buildJsonArray {})
                                    put("methods", buildJsonArray {})
                                },
                            )
                        }
                    },
                ),
            )
            put("edges", buildJsonArray {})
            put("assessments", buildJsonObject {})
        }

    @Test
    fun `a class the user could not previously save now round-trips`() {
        listOf("", "a\"b", "a\nb").forEach { name ->
            val model = classModel(name)
            val exported = PlantUmlDiagramExporter.render(model, PumlResidual.empty())
            assertNull(
                "a class named <$name> was rejected: ${RoundTripValidator.validate(exported.text, model)}",
                RoundTripValidator.validate(exported.text, model),
            )
        }
    }

    @Test
    fun `names that already worked keep working`() {
        listOf("Ok", "trailing ", "two words", "   ").forEach { name ->
            val model = classModel(name)
            val exported = PlantUmlDiagramExporter.render(model, PumlResidual.empty())
            assertNull("a class named <$name> regressed", RoundTripValidator.validate(exported.text, model))
        }
    }
}
