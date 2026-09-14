package de.tum.cit.aet.apollon.render

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** PlantUML's own wording when an include could not be fetched — the symptom this guards against. */
private const val CANNOT_OPEN_URL = "Cannot open URL"

class PlantUmlRenderServiceTest {
    private fun c4(include: String) =
        """
        @startuml
        $include

        title System Context Diagram

        Person(customer, "Customer", "Uses the online platform")
        System(platform, "Order Platform", "Allows customers to place and manage orders")
        Rel(customer, platform, "Uses", "HTTPS")

        @enduml
        """.trimIndent()

    private fun renderedSvg(source: String): String {
        val result = PlantUmlRenderService.render(source)
        assertTrue("render failed: $result", result is PlantUmlRenderService.RenderResult.Rendered)
        return (result as PlantUmlRenderService.RenderResult.Rendered).svg
    }

    /**
     * The words an SVG puts on the page. PlantUML lays a label out word by word — "Order Platform"
     * is two `<text>` elements — so searching the raw markup for a multi-word label always fails,
     * whether or not the diagram rendered.
     */
    private fun wordsIn(svg: String) =
        Regex("<text[^>]*>([^<]*)</text>")
            .findAll(svg)
            .map { it.groupValues[1].trim() }
            .filter { it.isNotEmpty() }
            .toSet()

    @Test
    fun `a C4 file written with includeurl renders offline`() {
        val svg =
            renderedSvg(
                c4("!includeurl https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml"),
            )
        assertFalse("the include was not answered locally", svg.contains(CANNOT_OPEN_URL))
        // The C4 macros ran: «person» is drawn by the stereotype, not by anything in the source.
        val words = wordsIn(svg)
        assertTrue("no C4 person shape in: $words", words.any { it.contains("person") })
        assertTrue("the diagram's own labels are missing: $words", words.containsAll(setOf("Customer", "Order", "Platform")))
    }

    @Test
    fun `the older RicardoNiepel URL and the plain include spelling work too`() {
        listOf(
            "!includeurl https://raw.githubusercontent.com/RicardoNiepel/C4-PlantUML/release/1-0/C4_Context.puml",
            "!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/v2.4.0/C4_Context.puml",
            "!include_once https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml",
        ).forEach { include ->
            assertFalse(include, renderedSvg(c4(include)).contains(CANNOT_OPEN_URL))
        }
    }

    @Test
    fun `a file already using the bundled include is unchanged`() {
        val source = c4("!include <C4/C4_Context>")
        assertEquals(source, PlantUmlRenderService.withLocalC4Includes(source))
    }

    /** The rewrite is for C4 only. Any other remote include is still the user's own business, and
     *  PlantUML's diagnostic is more honest than a silent substitution would be. */
    @Test
    fun `an unrelated remote include is left alone`() {
        val source = "@startuml\n!includeurl https://example.com/theme.puml\nclass A\n@enduml"
        assertEquals(source, PlantUmlRenderService.withLocalC4Includes(source))
    }

    /** A C4 file PlantUML does not bundle must not be rewritten into a broken local include. */
    @Test
    fun `an unbundled C4 file name is left alone`() {
        val source = "@startuml\n!includeurl https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Nonsense.puml\n@enduml"
        assertEquals(source, PlantUmlRenderService.withLocalC4Includes(source))
    }

    @Test
    fun `indentation is preserved so the rewrite cannot disturb a nested include`() {
        val rewritten =
            PlantUmlRenderService.withLocalC4Includes(
                "  !includeurl https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml",
            )
        assertEquals("  !include <C4/C4_Container>", rewritten)
    }

    @Test
    fun `an ordinary class diagram still renders`() {
        val svg = renderedSvg("@startuml\nclass Customer {\n  -id : Long\n}\n@enduml")
        assertTrue(svg.contains("Customer"))
    }
}
