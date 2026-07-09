import {
  applyEdits,
  modify,
  parse,
  type FormattingOptions,
  type ParseError,
} from "jsonc-parser"
import type { UMLDiagramType, UMLModel } from "@tumaet/apollon"

/** The `UMLModel` wire-format line this extension reads and writes. */
const MODEL_SCHEMA_VERSION = "4.0.0"

/** Older `.apollon` files nest the model under this key alongside app metadata. */
const MODEL_KEY = "model"

export class DiagramParseError extends Error {}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const isWrapped = (root: unknown): root is Record<string, unknown> =>
  isRecord(root) && MODEL_KEY in root

/**
 * Where the model lives in a given document. New files are a bare `UMLModel`;
 * files written by earlier versions wrap it under `model` next to now-unused
 * app metadata. Editing in place at this path keeps the wrapper's other keys and
 * their formatting untouched, so a diagram edit never rewrites the whole file.
 */
const modelPath = (root: unknown): (string | number)[] =>
  isWrapped(root) ? [MODEL_KEY] : []

/** Reads the model out of a `.apollon` document, wrapped or bare. */
export function parseModel(text: string): UMLModel {
  const errors: ParseError[] = []
  const root: unknown = parse(text, errors, { allowTrailingComma: true })
  if (errors.length > 0 || root === undefined) {
    throw new DiagramParseError("not valid JSON")
  }
  const candidate = isWrapped(root) ? root[MODEL_KEY] : root
  if (!isRecord(candidate) || typeof candidate.type !== "string") {
    throw new DiagramParseError("no UML model with a `type` field")
  }
  // Only the discriminator is checked here. Structural validation belongs to the
  // library, which rejects a malformed model on mount with a better message than
  // anything this extension could reconstruct from a JSON shape.
  return candidate as unknown as UMLModel
}

/**
 * What a document holds, as a value rather than an exception. An empty file is
 * not a failure: it is a diagram waiting to be chosen, and the canvas says so.
 */
export type DocumentState =
  | { kind: "empty" }
  | { kind: "model"; model: UMLModel }
  | { kind: "invalid"; reason: string }

export function readDocument(text: string): DocumentState {
  if (text.trim() === "") {
    return { kind: "empty" }
  }
  try {
    return { kind: "model", model: parseModel(text) }
  } catch (error) {
    return {
      kind: "invalid",
      reason:
        error instanceof DiagramParseError ? error.message : String(error),
    }
  }
}

/** A replacement of `[offset, offset + length)` — `jsonc-parser`'s edit shape. */
export interface TextRangeEdit {
  offset: number
  length: number
  content: string
}

/**
 * The edits that write `model` into `text`, touching only the model's own range.
 * Sibling keys, key order and the file's existing indentation survive, and the
 * range is minimal — so a text editor open on the same document keeps its cursor,
 * and undo granularity matches what actually changed.
 */
export function modelEdits(text: string, model: UMLModel): TextRangeEdit[] {
  const root: unknown = parse(text, [], { allowTrailingComma: true })
  return modify(text, modelPath(root), model, {
    formattingOptions: detectFormatting(text),
  })
}

export const applyTextRangeEdits = (
  text: string,
  edits: TextRangeEdit[]
): string => applyEdits(text, edits)

/** The model a brand-new diagram starts from. */
export function scaffoldModel(type: UMLDiagramType, title: string): UMLModel {
  return {
    version: MODEL_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    title,
    type,
    nodes: [],
    edges: [],
    assessments: {},
  }
}

/** {@link scaffoldModel} as the bytes of a new `.apollon` file. */
export function scaffold(type: UMLDiagramType, title: string): string {
  return `${JSON.stringify(scaffoldModel(type, title), null, 2)}\n`
}

/** Match the document's own indentation and line endings rather than imposing ours. */
export function detectFormatting(text: string): FormattingOptions {
  const eol = text.includes("\r\n") ? "\r\n" : "\n"
  const indent = /\n([ \t]+)\S/.exec(text)?.[1]
  if (indent?.startsWith("\t")) {
    return { tabSize: 2, insertSpaces: false, eol }
  }
  return { tabSize: indent?.length ?? 2, insertSpaces: true, eol }
}

/** Sibling image path for a diagram — `diagram.apollon` → `diagram.svg`. */
export function exportTargetPath(path: string, extension: string): string {
  return `${path.replace(/\.[^./\\]*$/, "")}.${extension}`
}
