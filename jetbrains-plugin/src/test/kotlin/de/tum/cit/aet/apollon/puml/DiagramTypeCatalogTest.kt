package de.tum.cit.aet.apollon.puml

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DiagramTypeCatalogTest {
    @Test
    fun `every tag is unique`() {
        val tags = DiagramTypeCatalog.ENTRIES.map { it.tag }
        assertEquals(tags.size, tags.toSet().size)
    }

    @Test
    fun `every entry belongs to a known group`() {
        DiagramTypeCatalog.ENTRIES.forEach { entry ->
            assertTrue("${entry.tag} has an unknown group ${entry.group}", entry.group in DiagramTypeCatalog.GROUPS)
        }
    }

    @Test
    fun `byTag finds an entry by its exact tag, and nothing else`() {
        assertEquals("C4-CONTAINER", DiagramTypeCatalog.byTag("C4-CONTAINER")?.tag)
        assertNull(DiagramTypeCatalog.byTag("c4-container"))
        assertNull(DiagramTypeCatalog.byTag(null))
        assertNull(DiagramTypeCatalog.byTag("NOT-A-TAG"))
    }

    @Test
    fun `byGroup returns exactly the entries in that group`() {
        val c4 = DiagramTypeCatalog.byGroup("C4")
        assertTrue(c4.isNotEmpty())
        assertTrue(c4.all { it.group == "C4" })
        assertEquals(DiagramTypeCatalog.ENTRIES.count { it.group == "C4" }, c4.size)
    }
}
