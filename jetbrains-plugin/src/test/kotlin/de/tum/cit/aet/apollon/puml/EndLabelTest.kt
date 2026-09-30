package de.tum.cit.aet.apollon.puml

import org.junit.Assert.assertEquals
import org.junit.Test

class EndLabelTest {
    @Test
    fun `bare number is multiplicity only`() {
        assertEquals("1" to "", splitEndLabel("1"))
    }

    @Test
    fun `star is multiplicity only`() {
        assertEquals("*" to "", splitEndLabel("*"))
    }

    @Test
    fun `range multiplicity`() {
        assertEquals("1..*" to "", splitEndLabel("1..*"))
    }

    @Test
    fun `word only is a role, not a multiplicity`() {
        assertEquals("" to "owner", splitEndLabel("owner"))
    }

    @Test
    fun `multiplicity followed by role splits both`() {
        assertEquals("*" to "items", splitEndLabel("* items"))
    }

    @Test
    fun `join is the exact inverse of split for every case above`() {
        for (raw in listOf("1", "*", "1..*", "owner", "* items", "0..1 parent")) {
            val (multiplicity, role) = splitEndLabel(raw)
            assertEquals(raw.trim(), joinEndLabel(multiplicity, role))
        }
    }

    @Test
    fun `join omits a blank multiplicity or role rather than leaving a stray space`() {
        assertEquals("owner", joinEndLabel("", "owner"))
        assertEquals("1", joinEndLabel("1", ""))
        assertEquals("", joinEndLabel("", ""))
    }
}
