package de.tum.cit.aet.apollon.editor

import com.intellij.openapi.fileEditor.TextEditorWithPreview
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * The one piece of the **View** tab's split behaviour that needs no running IDE: turning the layout
 * id stored in the workspace file back into a layout. Everything else in [PumlSplitFileEditor] is
 * platform wiring, exercised by `runIde` and the Plugin Verifier rather than here.
 */
class PumlSplitFileEditorTest {
    @Test
    fun `every layout the platform offers round-trips through its id`() {
        for (layout in TextEditorWithPreview.Layout.values()) {
            assertEquals(layout, pumlSplitLayoutFromId(layout.id))
        }
    }

    /** Not [PumlSplitFileEditor.DEFAULT_LAYOUT]: a file that has never recorded a layout must leave
     *  the choice to the application-wide one the platform remembers, rather than overriding it. */
    @Test
    fun `a file last opened before this tab could split has no layout of its own`() {
        assertNull(pumlSplitLayoutFromId(null))
    }

    @Test
    fun `an id this version does not know is not an error`() {
        assertNull(pumlSplitLayoutFromId("SHOW_THREE_PANES"))
        assertNull(pumlSplitLayoutFromId(""))
    }

    /** The point of the feature: a `.puml` opens with its source beside the render, which is what
     *  the split editor of the separate PlantUML integration plugin gave — without its need for the
     *  network, since this render comes from the bundled C4 macros. */
    @Test
    fun `an IDE with no remembered choice starts the tab out split`() {
        assertEquals(TextEditorWithPreview.Layout.SHOW_EDITOR_AND_PREVIEW, PumlSplitFileEditor.DEFAULT_LAYOUT)
    }
}
