package de.tum.cit.aet.apollon.document

import java.nio.charset.StandardCharsets
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption

/**
 * Writes [text] to [target] via a temp file + atomic rename, so a crash mid-write can never leave a
 * half-written file behind — the precedent already set by `export/DiagramExporter.kt`'s
 * sibling-image write.
 *
 * For a file the user edits directly (the `.puml` source itself) the plugin goes through the IDE's
 * `Document` layer instead, so that undo, dirty state and save all behave normally. This helper is
 * for generated siblings the user reads but never types into — the layout sidecar, exported images.
 */
fun writeAtomically(
    target: Path,
    text: String,
) {
    Files.createDirectories(target.parent)
    val tmp = Files.createTempFile(target.parent, target.fileName.toString(), ".tmp")
    try {
        Files.writeString(tmp, text, StandardCharsets.UTF_8)
        try {
            Files.move(tmp, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
        } catch (e: AtomicMoveNotSupportedException) {
            Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING)
        }
    } finally {
        Files.deleteIfExists(tmp)
    }
}
