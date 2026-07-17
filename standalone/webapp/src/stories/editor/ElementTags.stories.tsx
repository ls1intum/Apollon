import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, within } from "storybook/test"
import type { ApollonEditor, UMLModel } from "@tumaet/apollon"
import {
  editorStoryMeta,
  ApollonFixture,
  SeededPopoverHarness,
  fixtureByType,
  makeNode,
} from "../_support/editor"
import { ClassEditPopover } from "@tumaet/apollon/components/popovers/classDiagram/ClassEditPopover"

// ELEMENT TAGS — opaque, host-defined grouping labels on element data. Many
// elements may share one tag, which is the point: a host addresses a whole group
// with `editor.getElementIdsByTag(tag)` and colors it through the ephemeral
// `setElementHighlights` overlay. The driving case is Artemis recoloring a
// sample solution's attributes/methods from each programming-test result.
//
// Two halves, one story each: AUTHORING — the tag combobox, driven through the
// real store by an asserting `play` — and COLORING, the full editor end to end.
//
// Tag authoring is opt-in: nothing shows until a host sets the `tags` option.
// The harness seeds that config the same way the constructor would.

const meta = {
  title: "Editor/Element Tags",
  ...editorStoryMeta,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const TAG_VOCABULARY = [
  "testAttributes[Animal]",
  "testMethods[Animal]",
  "structure",
]

// ── Authoring ────────────────────────────────────────────────────────────────
/**
 * Tag authoring in the class popover, opted in with a host `tags` option that
 * supplies a vocabulary and allows creating new tags. Each taggable row (the
 * class and every attribute/method) shows its tags as removable chips followed
 * by a tag button; the button opens a combobox to search the vocabulary, toggle
 * a tag, or create one. Every write is trimmed and de-duplicated.
 */
export const Authoring: Story = {
  name: "Authoring: Tag a Class Member",
  parameters: { layout: "centered" },
  tags: ["autodocs", "test"],
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      seed={(diagram, metadata) => {
        metadata.getState().setTagConfig({
          enabled: true,
          available: TAG_VOCABULARY,
          allowCreate: true,
        })
        diagram.getState().addNode(
          makeNode("class-1", "class", {
            name: "Animal",
            tags: ["structure"],
            attributes: [
              {
                id: "a1",
                name: "+ name: String",
                tags: ["testAttributes[Animal]"],
              },
            ],
            methods: [{ id: "m1", name: "+ run()" }],
          })
        )
      }}
    >
      <ClassEditPopover elementId="class-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Existing tags show inline as removable chips — the class and the attribute.
    await expect(
      canvas.getByRole("button", { name: "Remove tag structure" })
    ).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Remove tag testAttributes[Animal]" })
    ).toBeVisible()

    // Open the attribute's tag combobox and create a tag off the vocabulary.
    // The popover portals to <body>, so query it through `screen`, not `canvas`.
    await userEvent.click(
      canvas.getByRole("button", { name: "Tags for attribute" })
    )
    const search = await screen.findByLabelText("Search tags")
    await userEvent.type(search, "testName")
    await userEvent.click(await screen.findByText('Create "testName"'))
    await expect(
      canvas.getByRole("button", { name: "Remove tag testName" })
    ).toBeVisible()
  },
}

// ── Coloring ─────────────────────────────────────────────────────────────────
// Member ids are the real ones from tests/fixtures/class-diagram.json. Note that
// `a1` (Animal.name) and `a3` (Dog.breed) share `testAttributeNaming`: one
// convention test spanning two classes is exactly what a per-element id cannot
// express, and the reason tags are many-to-many.
const TAGS_BY_MEMBER_ID: Record<string, string[]> = {
  a1: ["testAttributeNaming"],
  a3: ["testAttributeNaming"],
  m1: ["testMethods[Animal]"],
  m3: ["testMethods[Dog]"],
  m5: ["testMethods[Vehicle]"],
}

const withMemberTags = <T extends { id: string }>(members: readonly T[]) =>
  members.map((member) =>
    TAGS_BY_MEMBER_ID[member.id]
      ? { ...member, tags: TAGS_BY_MEMBER_ID[member.id] }
      : member
  )

// The shipped fixture is untagged, so tag it here rather than forking a second
// fixture — the same approach the graded model in Class Diagram takes.
const taggedClassModel: UMLModel = {
  ...fixtureByType.ClassDiagram,
  nodes: fixtureByType.ClassDiagram.nodes.map((node) => {
    const data = node.data as {
      attributes?: { id: string }[]
      methods?: { id: string }[]
    }
    return {
      ...node,
      data: {
        ...data,
        ...(data.attributes && { attributes: withMemberTags(data.attributes) }),
        ...(data.methods && { methods: withMemberTags(data.methods) }),
      },
    }
  }),
}

const STATUS_COLOR = {
  pass: "rgba(34, 197, 94, 0.35)",
  fail: "rgba(239, 68, 68, 0.35)",
  untested: "rgba(148, 163, 184, 0.35)",
}

// What a host holds after a student submission: a status per test case, keyed by
// the same tag the instructor authored.
const BUILD_RESULTS: Record<string, keyof typeof STATUS_COLOR> = {
  testAttributeNaming: "pass",
  "testMethods[Animal]": "pass",
  "testMethods[Dog]": "fail",
  "testMethods[Vehicle]": "untested",
}

/** The recipe from docs/library/api/element-tags.md, with the results hoisted. */
const applyBuildResults = (editor: ApollonEditor) => {
  const highlights: Record<string, string> = {}
  for (const [tag, status] of Object.entries(BUILD_RESULTS)) {
    for (const id of editor.getElementIdsByTag(tag)) {
      highlights[id] = STATUS_COLOR[status]
    }
  }
  editor.setElementHighlights(highlights)
}

/**
 * The issue #50 workflow end to end: each tagged attribute/method is looked up
 * by its test-case tag and tinted green (passing), red (failing) or grey
 * (untested). `testAttributeNaming` colors members on two different classes from
 * one lookup. The tint is the ephemeral overlay — nothing here is written
 * into the model, serialized, or shared with collaborators, so the same sample
 * solution renders differently per student without ever being mutated.
 */
export const GroupColoring: Story = {
  name: "Coloring: Build Results by Tag",
  parameters: { layout: "fullscreen" },
  render: () => (
    <ApollonFixture model={taggedClassModel} onMount={applyBuildResults} />
  ),
}
