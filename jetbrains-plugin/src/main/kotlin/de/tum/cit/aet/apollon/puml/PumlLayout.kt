package de.tum.cit.aet.apollon.puml

import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.sqrt

data class Size(val width: Int, val height: Int)

data class Point(val x: Int, val y: Int)

data class Rect(val x: Int, val y: Int, val width: Int, val height: Int) {
    val centerX get() = x + width / 2
    val centerY get() = y + height / 2
}

private const val HEADER_HEIGHT = 40
private const val HEADER_HEIGHT_WITH_STEREOTYPE = 50
private const val ROW_HEIGHT = 30
private const val DEFAULT_WIDTH = 160 // DROPS.DEFAULT_ELEMENT_WIDTH (library/lib/constants.ts) — the canvas auto-grows from here.
private const val GRID_SNAP = 10

/** Rough advance width of one character at the canvas's default class font, and the left+right
 *  inset around a member line — the same estimate `C4ModelMapper` sizes its detail lines with. */
private const val CHAR_WIDTH = 7
private const val TEXT_PADDING = 24

/** A class wider than this is a sign the member lines are long prose rather than signatures;
 *  past it the canvas's own wrapping reads better than an ever-wider box. */
private const val MAX_WIDTH = 400

// Chosen so a grid of default-sized boxes keeps the 260x220 pitch every other family's layout
// was already tuned around.
private const val COL_GAP = 100
private const val ROW_GAP = 80
private const val DEFAULT_ROW_HEIGHT = 140

/** Deterministic geometry for nodes/edges Architect Studio creates — no external layout engine
 *  (plan §D5), so the same [PumlDiagram] always lays out the same way. */
object PumlLayout {
    fun sizeOf(type: PumlType): Size {
        val header = if (type.kind == PumlKind.INTERFACE || type.kind == PumlKind.ENUM) HEADER_HEIGHT_WITH_STEREOTYPE else HEADER_HEIGHT
        val rows = type.attributes.size + type.methods.size
        val height = ceilToGrid(header + ROW_HEIGHT * rows)
        val lines = listOf(type.name) + (type.attributes + type.methods).map { it.apollonName }
        return Size(widthFor(lines), height)
    }

    /** The uniform-cell grid the families that have no per-node size to offer still use. */
    fun gridPositions(
        count: Int,
        originX: Int,
        originY: Int,
    ): List<Point> =
        if (count <= 0) emptyList() else gridPositions(List(count) { Size(DEFAULT_WIDTH, DEFAULT_ROW_HEIGHT) }, originX, originY)

    /** Same header+rows sizing as [sizeOf], for families with no interface/enum stereotype header
     *  variant (Object/Component/Deployment/UseCase — plan §9's new families). */
    fun sizeOfRows(
        rowCount: Int,
        header: Int = HEADER_HEIGHT,
    ): Size = Size(DEFAULT_WIDTH, ceilToGrid(header + ROW_HEIGHT * rowCount))

    /** Wide enough for the longest of [lines], never narrower than the canvas's own default and
     *  never wider than [MAX_WIDTH]. Estimated rather than measured — nothing here can ask the
     *  browser for a text metric, and the canvas re-measures and grows the box on first render
     *  anyway; the estimate only has to be close enough that a fresh import does not overlap. */
    fun widthFor(lines: List<String>): Int {
        val longest = lines.maxOfOrNull { it.length } ?: 0
        return ceilToGrid((longest * CHAR_WIDTH + TEXT_PADDING).coerceIn(DEFAULT_WIDTH, MAX_WIDTH))
    }

    private fun ceilToGrid(value: Int): Int = ceil(value / GRID_SNAP.toDouble()).toInt() * GRID_SNAP

    /**
     * A square-ish grid of [sizes], laid out so no box overlaps its neighbours: each column is as
     * wide as its widest box and each row as tall as its tallest, rather than every cell sharing
     * one constant. A class with a long member list used to be drawn straight through the class
     * below it.
     */
    fun gridPositions(
        sizes: List<Size>,
        originX: Int,
        originY: Int,
    ): List<Point> {
        if (sizes.isEmpty()) return emptyList()
        val cols = ceil(sqrt(sizes.size.toDouble())).toInt().coerceAtLeast(1)
        val colWidths = (0 until cols).map { c -> sizes.filterIndexed { i, _ -> i % cols == c }.maxOf { it.width } }
        val rowHeights = sizes.chunked(cols).map { row -> row.maxOf { it.height } }
        val colX = colWidths.runningFold(originX) { x, w -> x + w + COL_GAP }
        val rowY = rowHeights.runningFold(originY) { y, h -> y + h + ROW_GAP }
        return sizes.indices.map { i -> Point(colX[i % cols], rowY[i / cols]) }
    }

    /** Compares rectangle centers; ties go to the vertical pair. */
    fun chooseHandles(
        source: Rect,
        target: Rect,
    ): Pair<String, String> {
        val dx = target.centerX - source.centerX
        val dy = target.centerY - source.centerY
        return if (abs(dy) >= abs(dx)) {
            if (dy >= 0) "bottom" to "top" else "top" to "bottom"
        } else {
            if (dx >= 0) "right" to "left" else "left" to "right"
        }
    }
}
