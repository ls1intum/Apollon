package de.tum.cit.aet.apollon.document

import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

private const val TYPE_FIELD = "type"

class DiagramDocumentTest {
    @Test
    fun `empty text reads as empty`() {
        assertEquals(DocumentState.Empty, readDocument(""))
        assertEquals(DocumentState.Empty, readDocument("   \n  "))
    }

    @Test
    fun `bare model reads as model`() {
        val text = """{"version":"4.0.0","id":"x","title":"t","type":"ClassDiagram","nodes":[],"edges":[]}"""
        val state = readDocument(text)
        assertTrue(state is DocumentState.Model)
        assertEquals("ClassDiagram", (state as DocumentState.Model).model[TYPE_FIELD]!!.jsonPrimitive.content)
    }

    @Test
    fun `wrapped legacy model reads as model`() {
        val text = """{"model":{"type":"ClassDiagram","nodes":[]},"other":"kept elsewhere"}"""
        val state = readDocument(text)
        assertTrue(state is DocumentState.Model)
        assertEquals("ClassDiagram", (state as DocumentState.Model).model[TYPE_FIELD]!!.jsonPrimitive.content)
    }

    @Test
    fun `invalid json is invalid`() {
        assertTrue(readDocument("not json") is DocumentState.Invalid)
    }

    @Test
    fun `json without a type field is invalid`() {
        assertTrue(readDocument("""{"nodes":[]}""") is DocumentState.Invalid)
    }

    @Test
    fun `writeDocumentText keeps sibling keys of a wrapped file`() {
        val existing = """{"model":{"type":"ClassDiagram","nodes":[]},"appVersion":"3.0.0"}"""
        val model = scaffoldModel("ClassDiagram", "renamed")
        val text = writeDocumentText(existing, model)
        assertTrue(text.contains("\"appVersion\": \"3.0.0\""))
        assertTrue(text.contains("\"title\": \"renamed\""))
    }

    @Test
    fun `writeDocumentText on a bare file stays bare`() {
        val existing = """{"version":"4.0.0","id":"x","title":"old","type":"ClassDiagram","nodes":[],"edges":[]}"""
        val model = scaffoldModel("ClassDiagram", "renamed")
        val text = writeDocumentText(existing, model)
        assertTrue(!text.contains("\"model\""))
        assertTrue(text.contains("\"title\": \"renamed\""))
    }

    @Test
    fun `detectFormatting matches tab and crlf documents`() {
        val tabbed = "{\r\n\t\"a\": 1\r\n}"
        val formatting = detectFormatting(tabbed)
        assertEquals("\r\n", formatting.eol)
        assertEquals("\t", formatting.indent)
    }

    @Test
    fun `exportTargetPath swaps the extension`() {
        assertEquals("diagram.svg", exportTargetPath("diagram.apollon", "svg"))
        assertEquals("dir/diagram.png", exportTargetPath("dir/diagram.apollon", "png"))
    }

    @Test
    fun `diagramTitle strips the directory and extension`() {
        assertEquals("orders", diagramTitle("/a/b/orders.apollon"))
        assertEquals("ORDERS", diagramTitle("ORDERS.APOLLON"))
    }
}
