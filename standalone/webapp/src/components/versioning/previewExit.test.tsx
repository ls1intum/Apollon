/**
 * Both preview-exit affordances — "Return to current" and deleting the
 * previewed version — must clear `?version=` (via useClosePreview), not the
 * store directly, or the URL→store sync re-enters preview. Asserts the param is
 * gone after each interaction.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  AlertDialog,
  AlertDialogContent,
} from "@tumaet/ui/components/alert-dialog"
import { renderWithRouter } from "@/test/renderWithRouter"
import { wrapWithQueryClient } from "@/test/queryTestUtils"
import { ModalProvider } from "@/contexts"
import { CurrentVersionRow } from "./CurrentVersionRow"
import { DeleteVersionModal } from "./DeleteVersionModal"
import { useVersionStore } from "@/stores/useVersionStore"
import { VersionApiClient } from "@/services/DiagramApiClient"
import type { UMLModel } from "@tumaet/apollon"

const DIAGRAM_ID = "diag-1"
const VERSION_ID = "ver-1"
const body = { nodes: [], edges: [] } as unknown as UMLModel

beforeEach(() => {
  useVersionStore.setState({
    preview: { diagramId: DIAGRAM_ID, versionId: VERSION_ID, body },
  })
})

afterEach(() => {
  cleanup()
  useVersionStore.setState({ preview: null })
  vi.restoreAllMocks()
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
        wrapper: (children) => wrapWithQueryClient(children),
      }
    )

    await userEvent.click(
      await screen.findByRole("button", { name: /return to current/i })
    )

    expect(router.state.location.search).not.toHaveProperty("version")
  })

  it("deleting the previewed version also strips ?version=", async () => {
    // The modal's delete mutation flows through the bound repository (the
    // default RemoteVersionRepository delegates to VersionApiClient).
    const deleteSpy = vi
      .spyOn(VersionApiClient, "delete")
      .mockResolvedValue(undefined)

    const { router } = renderWithRouter(
      // DeleteVersionModal renders only the AlertDialog *body* (footer, cancel,
      // description); production mounts it inside ModalFrame's dialog root. Give
      // it an open AlertDialog root here so its AlertDialog parts resolve their
      // root context, mirroring how it actually renders.
      <ModalProvider>
        <AlertDialog open>
          <AlertDialogContent>
            <DeleteVersionModal
              diagramId={DIAGRAM_ID}
              versionId={VERSION_ID}
              version={null}
              kind="remote"
            />
          </AlertDialogContent>
        </AlertDialog>
      </ModalProvider>,
      {
        initialEntry: `/local/${DIAGRAM_ID}?version=${VERSION_ID}`,
        routePaths: ["/local/$id"],
        wrapper: (children) => wrapWithQueryClient(children),
      }
    )

    await userEvent.click(
      await screen.findByRole("button", { name: /delete/i })
    )

    await waitFor(() =>
      expect(deleteSpy).toHaveBeenCalledWith(DIAGRAM_ID, VERSION_ID)
    )
    expect(router.state.location.search).not.toHaveProperty("version")
  })
})
