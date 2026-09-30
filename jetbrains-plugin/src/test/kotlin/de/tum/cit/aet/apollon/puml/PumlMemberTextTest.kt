package de.tum.cit.aet.apollon.puml

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PumlMemberTextTest {
    @Test
    fun `plain field with visibility and type`() {
        val member = parseMemberText("+name : Type")
        assertEquals("+", member.visibility)
        assertEquals("name", member.signature)
        assertEquals("Type", member.type)
        assertFalse(member.isMethod)
        assertEquals("+ name: Type", member.toApollonName())
        assertEquals("+name : Type", member.toPumlLine(isAbstract = false))
    }

    @Test
    fun `abstract modifier moves to the isAbstract flag, not the modifier list`() {
        val member = parseMemberText("{abstract} +render()")
        assertTrue(member.isAbstractModifier)
        assertTrue(member.modifiers.isEmpty())
        assertTrue(member.isMethod)
        assertEquals("+ render()", member.toApollonName())
        assertEquals("{abstract} +render()", member.toPumlLine(isAbstract = true))
    }

    @Test
    fun `static modifier round-trips through both spacings`() {
        val member = parseMemberText("+ {static} instances : int")
        assertEquals(listOf("static"), member.modifiers)
        assertEquals("+ {static} instances: int", member.toApollonName())
        assertEquals("+ {static} instances : int", member.toPumlLine(isAbstract = false))
    }

    @Test
    fun `colon inside a method's parameter list is not the type separator`() {
        val member = parseMemberText("~bar(x : int) : bool")
        assertTrue(member.isMethod)
        assertEquals("~", member.visibility)
        assertEquals("bar(x : int)", member.signature)
        assertEquals("bool", member.type)
    }

    @Test
    fun `no visibility glyph leaves visibility blank`() {
        val member = parseMemberText("name : Type")
        assertEquals("", member.visibility)
        assertEquals("name: Type", member.toApollonName())
    }

    @Test
    fun `member with no type omits the colon entirely`() {
        val member = parseMemberText("-secret")
        assertEquals(null, member.type)
        assertEquals("- secret", member.toApollonName())
        assertEquals("-secret", member.toPumlLine(isAbstract = false))
    }
}
