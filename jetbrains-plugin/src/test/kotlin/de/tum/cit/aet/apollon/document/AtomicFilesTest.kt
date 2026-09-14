package de.tum.cit.aet.apollon.document

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.nio.file.Files

class AtomicFilesTest {
    @get:Rule
    val tmp = TemporaryFolder()

    @Test
    fun `writes a brand new file`() {
        val target = tmp.root.toPath().resolve("nested/dir/file.json")
        writeAtomically(target, "hello")
        assertEquals("hello", Files.readString(target))
    }

    @Test
    fun `overwrites an existing file`() {
        val target = tmp.newFile("file.json").toPath()
        Files.writeString(target, "old")
        writeAtomically(target, "new")
        assertEquals("new", Files.readString(target))
    }

    @Test
    fun `leaves no leftover temp file behind`() {
        val dir = tmp.newFolder("dir").toPath()
        val target = dir.resolve("file.json")
        writeAtomically(target, "content")
        val remaining = Files.list(dir).use { it.toList() }
        assertEquals(listOf(target), remaining)
    }

    @Test
    fun `creates missing parent directories`() {
        val target = tmp.root.toPath().resolve("a/b/c/file.json")
        assertFalse(Files.exists(target.parent))
        writeAtomically(target, "x")
        assertTrue(Files.exists(target))
    }
}
