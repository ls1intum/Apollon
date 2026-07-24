import { describe, expect, it } from "vitest"
import { DEFAULT_LABELS } from "@/i18n/labels"

/**
 * Popover titles are derived from the node type rather than a per-type table, so
 * a new element gets a sensible title for free. The derivation has to strip the
 * diagram prefix, or the title reads "Reachability Graph Marking" where the
 * hand-written titles on type-specific popovers say "Marking".
 */
describe("nodeTypeLabel", () => {
  it.each([
    ["petriNetTransition", "Transition"],
    ["reachabilityGraphMarking", "Marking"],
    ["syntaxTreeNonterminal", "Nonterminal"],
    ["flowchartInputOutput", "Input Output"],
    ["bpmnCallActivity", "Call Activity"],
  ])("strips the diagram prefix from %s", (nodeType, expected) => {
    expect(DEFAULT_LABELS.nodeTypeLabel(nodeType)).toBe(expected)
  })

  // A prefix that IS the whole type would leave nothing to title.
  it("keeps a type that is only a diagram prefix", () => {
    expect(DEFAULT_LABELS.nodeTypeLabel("component")).toBe("Component")
  })

  it("falls back when there is no node type", () => {
    expect(DEFAULT_LABELS.nodeTypeLabel()).toBe("Element")
  })
})
