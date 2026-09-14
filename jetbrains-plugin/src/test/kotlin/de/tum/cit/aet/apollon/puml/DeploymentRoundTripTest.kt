package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Deployment-diagram counterpart of [RoundTripTest] — see its doc comment for the contract. */
class DeploymentRoundTripTest {
    private val serverPuml =
        """
        @startuml
        node "Application Server" as app
        artifact "app.war" as war
        device "Load Balancer" as lb
        app ..> war
        lb -- app
        @enduml

        """.trimIndent() + "\n"

    private fun importAndExport(source: String): String {
        val parsed = PlantUmlDeploymentImporter.parse(source) as PumlDeploymentParseResult.Parsed
        val mapped = DeploymentModelMapper.toApollonModel(parsed.diagram, null, "server")
        val residual =
            parsed.residual.copy(typeKeywords = mapped.typeKeywords, arrowTokens = mapped.arrowTokens, elementAliases = mapped.elementAliases)
        val export = DeploymentModelMapper.toPumlDiagram(mapped.model, residual)
        val prunedResidual =
            residual.copy(typeKeywords = export.typeKeywords, arrowTokens = export.arrowTokens, elementAliases = export.elementAliases)
        return PlantUmlDeploymentExporter.render(export.diagram, prunedResidual)
    }

    @Test
    fun `unedited import-then-export reparses to the same elements and relation count`() {
        val parsed = PlantUmlDeploymentImporter.parse(serverPuml) as PumlDeploymentParseResult.Parsed
        val exportedText = importAndExport(serverPuml)
        val reparsed = PlantUmlDeploymentImporter.parse(exportedText) as PumlDeploymentParseResult.Parsed

        assertEquals(parsed.diagram.elements.map { it.displayName }.toSet(), reparsed.diagram.elements.map { it.displayName }.toSet())
        assertEquals(parsed.diagram.relations.size, reparsed.diagram.relations.size)
        assertEquals(0, reparsed.unsupportedCount)
    }

    @Test
    fun `re-exporting an unedited model twice produces byte-identical PlantUML`() {
        assertEquals(importAndExport(serverPuml), importAndExport(serverPuml))
    }

    @Test
    fun `the device keyword round-trips as its own stereotype, distinct from node`() {
        val exportedText = importAndExport(serverPuml)
        assertTrue(exportedText.contains("device "))
        assertTrue(exportedText.contains("node "))
    }

    @Test
    fun `the diagram type detector recognizes this source as a deployment diagram`() {
        assertEquals(DiagramFamily.DEPLOYMENT, DiagramTypeDetector.detect(serverPuml))
    }

    @Test
    fun `a node boundary nests its component and artifact children`() {
        val bounded =
            """
            @startuml
            node "Application Server" as app {
              component "Web App" as web
              artifact "app.war" as war
            }
            @enduml

            """.trimIndent() + "\n"

        val parsed = PlantUmlDeploymentImporter.parse(bounded) as PumlDeploymentParseResult.Parsed
        val web = parsed.diagram.elements.single { it.refId == "web" }
        assertEquals("app", web.parentRefId)

        val exportedText = importAndExport(bounded)
        val reparsed = PlantUmlDeploymentImporter.parse(exportedText) as PumlDeploymentParseResult.Parsed
        val reparsedWeb = reparsed.diagram.elements.single { it.displayName == "Web App" }
        val reparsedNode = reparsed.diagram.elements.single { it.displayName == "Application Server" }
        assertEquals(reparsedNode.refId, reparsedWeb.parentRefId)
    }

    @Test
    fun `the round trip validator accepts an unedited deployment diagram`() {
        val parsed = PlantUmlDeploymentImporter.parse(serverPuml) as PumlDeploymentParseResult.Parsed
        val mapped = DeploymentModelMapper.toApollonModel(parsed.diagram, null, "server")
        val residual =
            parsed.residual.copy(typeKeywords = mapped.typeKeywords, arrowTokens = mapped.arrowTokens, elementAliases = mapped.elementAliases)
        val exported = PlantUmlDiagramExporter.render(mapped.model, residual)
        assertEquals(null, RoundTripValidator.validate(exported.text, mapped.model))
    }

    /**
     * The deployment palette's boxes can now carry a technology and a description, but plain
     * PlantUML deployment syntax is `node "X" { ... }` and has nowhere to put either — only C4 does.
     * So the save is refused with something to act on, rather than the text disappearing the next
     * time the file is written.
     */
    @Test
    fun `a description typed onto a plain deployment node is refused rather than dropped`() {
        val parsed = PlantUmlDeploymentImporter.parse(serverPuml) as PumlDeploymentParseResult.Parsed
        val mapped = DeploymentModelMapper.toApollonModel(parsed.diagram, null, "server")
        val residual =
            parsed.residual.copy(typeKeywords = mapped.typeKeywords, arrowTokens = mapped.arrowTokens, elementAliases = mapped.elementAliases)
        val described =
            JsonObject(
                mapped.model.toMutableMap().apply {
                    put(
                        "nodes",
                        buildJsonArray {
                            (mapped.model["nodes"] as JsonArray).map { it as JsonObject }.forEach { node ->
                                val data = node["data"] as JsonObject
                                val withDescription =
                                    if (textOf(data["name"]) != "Application Server") {
                                        node
                                    } else {
                                        JsonObject(
                                            node.toMutableMap().apply {
                                                put("data", JsonObject(data.toMutableMap().apply { put("description", JsonPrimitive("Runs the app")) }))
                                            },
                                        )
                                    }
                                add(withDescription as JsonElement)
                            }
                        },
                    )
                },
            )
        val exported = PlantUmlDiagramExporter.render(described, residual)
        val refusal = RoundTripValidator.validate(exported.text, described)
        assertNotNull(refusal)
        assertTrue(refusal!!.contains("Application Server"))
    }

    /** The same hole on the relationship side: `app ..> war : deploys` can carry a label, but
     *  nothing after it. */
    @Test
    fun `a technology typed onto a plain deployment relationship is refused rather than dropped`() {
        val parsed = PlantUmlDeploymentImporter.parse(serverPuml) as PumlDeploymentParseResult.Parsed
        val mapped = DeploymentModelMapper.toApollonModel(parsed.diagram, null, "server")
        val residual =
            parsed.residual.copy(typeKeywords = mapped.typeKeywords, arrowTokens = mapped.arrowTokens, elementAliases = mapped.elementAliases)
        val described =
            JsonObject(
                mapped.model.toMutableMap().apply {
                    put(
                        "edges",
                        buildJsonArray {
                            (mapped.model["edges"] as JsonArray).map { it as JsonObject }.forEachIndexed { index, edge ->
                                val withTechnology =
                                    if (index != 0) {
                                        edge
                                    } else {
                                        JsonObject(
                                            edge.toMutableMap().apply {
                                                val data = edge["data"] as JsonObject
                                                put("data", JsonObject(data.toMutableMap().apply { put("technology", JsonPrimitive("HTTPS")) }))
                                            },
                                        )
                                    }
                                add(withTechnology as JsonElement)
                            }
                        },
                    )
                },
            )
        val exported = PlantUmlDiagramExporter.render(described, residual)
        val refusal = RoundTripValidator.validate(exported.text, described)
        assertNotNull(refusal)
        assertTrue(refusal!!.contains("connection"))
    }
}
