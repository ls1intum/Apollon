/**
 * Both preview-exit affordances — "Return to current" and deleting the
 * previewed version — must clear `?version=` (via useClosePreview), not the
 * store directly, or the URL→store sync re-enters preview. Asserts the param is
 * gone after each interaction.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithRouter } from "@/test/renderWithRouter"
import { ModalProvider } from "@/contexts"
import { CurrentVersionRow } from "./CurrentVersionRow"
import { DeleteVersionModal } from "./DeleteVersionModal"
import { useVersionStore } from "@/stores/useVersionStore"
import type { UMLModel } from "@tumaet/apollon"

const DIAGRAM_ID = "diag-1"
const VERSION_ID = "ver-1"
const body = { nodes: [], edges: [] } as unknown as UMLModel

beforeEach(() => {
  useVersionStore.setState({
    versions: {
      [DIAGRAM_ID]: [
        {
          id: VERSION_ID,
          diagramId: DIAGRAM_ID,
          name: "First",
          description: "First",
          seq: 1,
          createdAt: new Date(0).toISOString(),
          status: "saved",
        },
      ] as never,
    },
    preview: { diagramId: DIAGRAM_ID, versionId: VERSION_ID, body },
  })
})

afterEach(() => {
  cleanup()
  useVersionStore.setState({ versions: {}, preview: null })
})

describe("URL-driven preview exit", () => {
  it("'Return to current' strips ?version= from the URL", async () => {
    const { router } = renderWithRouter(
      <CurrentVersionRow
        diagramId={DIAGRAM_ID}
        hasChanges={false}
        latestSavedVersion={undefined}
      />,
      {
        initialEntry: `/local/${DIAGRAM_ID}?version=${VERSION_ID}`,
        routePaths: ["/local/$id"],
      }
    )

    await userEvent.click(
      await screen.findByRole("button", { name: /return to current/i })
    )

    expect(router.state.location.search).not.toHaveProperty("version")
  })

  it("deleting the previewed version strips ?version= before deleting", async () => {
    const deleteVersion = vi.fn().mockResolvedValue(undefined)
    useVersionStore.setState({ deleteVersion })

    const { router } = renderWithRouter(
      <ModalProvider>
        <DeleteVersionModal
          diagramId={DIAGRAM_ID}
          versionId={VERSION_ID}
          version={null}
        />
      </ModalProvider>,
      {
        initialEntry: `/local/${DIAGRAM_ID}?version=${VERSION_ID}`,
        routePaths: ["/local/$id"],
      }
    )

    await userEvent.click(
      await screen.findByRole("button", { name: /delete/i })
    )

    expect(deleteVersion).toHaveBeenCalledWith(DIAGRAM_ID, VERSION_ID)
    expect(router.state.location.search).not.toHaveProperty("version")
  })
})
