import { Button } from "@tumaet/ui/components/button"
import NodeCreation from "assets/images/how-to-use-node-creation.png"
import EdgeCreation from "assets/images/how-to-use-edge-creation.png"
import NodeEdit from "assets/images/how-to-use-node-edit.png"
import NodeMove from "assets/images/how-to-use-node-move.png"

type HowToUseModalProps = {
  /** Called when the user dismisses the walkthrough via the Close button. */
  onClose: () => void
}

export const HowToUseModal = ({ onClose }: HowToUseModalProps) => {
  return (
    <div className="flex flex-col gap-6 p-6 text-foreground">
      <div className="grid grid-cols-[auto,1fr,auto] gap-x-4 gap-y-6">
        {/* Add Node */}
        <h5 className="text-lg font-bold">Add Node</h5>
        <p className="text-muted-foreground">
          To add a node, simply drag and drop one of the elements on the left
          side into the editor area.
        </p>
        <img
          className="h-auto w-64 object-contain"
          src={NodeCreation}
          alt="Node creation example"
        />

        {/* Separator */}
        <div className="col-span-3 border-t border-border"></div>

        {/* Add Edge */}
        <h5 className="text-lg font-bold">Add Edge</h5>
        <p className="text-muted-foreground">
          To add an edge between nodes, select the source class with a single
          click and you will see blue circles around the node. Those are the
          possible connection points for edge. Click and hold on one of those
          and drag it to another node to create an edge.
        </p>
        <img
          className="h-auto w-64 object-contain"
          src={EdgeCreation}
          alt="Edge creation example"
        />

        {/* Separator */}
        <div className="col-span-3 border-t border-border"></div>

        {/* Edit Class */}
        <h5 className="text-lg font-bold">Edit Class</h5>
        <p className="text-muted-foreground">
          To edit a class, double click it and a popup will open up, in which
          you can edit its components, e.g. name, attributes, methods, etc.
        </p>
        <img
          className="h-auto w-64 object-contain"
          src={NodeEdit}
          alt="Node edit example"
        />

        {/* Separator */}
        <div className="col-span-3 border-t border-border"></div>

        {/* Delete Class */}
        <h5 className="text-lg font-bold">Delete Class</h5>
        <p className="col-span-2 text-muted-foreground">
          To delete a class, select it with a single click and either press{" "}
          <code>Delete</code> or <code>Backspace</code> on your keyboard.
        </p>

        {/* Separator */}
        <div className="col-span-3 border-t border-border"></div>

        {/* Move Class */}
        <h5 className="text-lg font-bold">Move Class</h5>
        <p className="text-muted-foreground">
          To move a class, select it with a single click and either use your
          keyboard arrows or drag and drop it.
        </p>
        <img
          className="h-auto w-64 object-contain"
          src={NodeMove}
          alt="Node move example"
        />

        {/* Separator */}
        <div className="col-span-3 border-t border-border"></div>

        {/* Undo & Redo */}
        <h5 className="text-lg font-bold">Undo & Redo</h5>
        <p className="col-span-2 text-muted-foreground">
          With <code>Ctrl+Z</code> and <code>Ctrl+Y</code> you can undo and redo
          your changes.
        </p>
      </div>
      <Button variant="default" onClick={onClose}>
        Close
      </Button>
    </div>
  )
}
