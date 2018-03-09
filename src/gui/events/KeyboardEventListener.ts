import { Store } from "redux";
import {
    deleteSelectedElements,
    duplicateSelectedEntities,
    flipSelectedRelationships,
    moveSelectedEntities
} from "./handlers";
import KeyCodes from "./keyCodes";
import { redo, ReduxAction, ReduxState, undo } from "../redux";
import { ElementSelection } from "../../core/domain";
import { UUID } from "../../core/utils";

export default class KeyboardEventListener {
    private store: Store<ReduxState>;
    private selectElements: (entityIds: UUID[], relationshipIds: UUID[]) => void;

    private selection: ElementSelection = {
        entityIds: [],
        relationshipIds: []
    };

    constructor(
        store: Store<ReduxState>,
        selectElements: (entityIds: UUID[], relationshipIds: UUID[]) => void
    ) {
        this.store = store;
        this.selectElements = selectElements;
    }

    startListening() {
        document.addEventListener("keydown", this.handleKeyDownEvent);
    }

    stopListening() {
        document.removeEventListener("keydown", this.handleKeyDownEvent);
    }

    setSelection(newSelection: ElementSelection) {
        this.selection = newSelection;
    }

    private handleKeyDownEvent = (e: KeyboardEvent) => {
        if (e.target === document.body) {
            const actions = this.getActionsForKeyDownEvent(e);

            if (actions.length === 0) {
                return;
            }

            for (const action of actions) {
                if (typeof action === "function") {
                    action();
                } else {
                    this.store.dispatch(action);
                }
            }

            // We've handled this event, thus stop further propagation
            e.stopPropagation();
            e.preventDefault();
        }
    };

    private getActionsForKeyDownEvent(e: KeyboardEvent): ((() => void) | ReduxAction)[] {
        const state = this.store.getState();

        switch (e.keyCode) {
            case KeyCodes.ArrowLeft:
                return moveSelectedEntities(this.selection.entityIds, -state.editor.gridSize, 0);

            case KeyCodes.ArrowUp:
                return moveSelectedEntities(this.selection.entityIds, 0, -state.editor.gridSize);

            case KeyCodes.ArrowRight:
                return moveSelectedEntities(this.selection.entityIds, state.editor.gridSize, 0);

            case KeyCodes.ArrowDown:
                return moveSelectedEntities(this.selection.entityIds, 0, state.editor.gridSize);

            case KeyCodes.Backspace:
            case KeyCodes.Delete:
                return deleteSelectedElements(this.selection);

            case KeyCodes.Escape:
                return [() => this.selectElements([], [])];

            case KeyCodes.A:
                return [
                    () => this.selectElements(state.entities.allIds, state.relationships.allIds)
                ];

            case KeyCodes.D:
                return duplicateSelectedEntities(this.selection, state);

            case KeyCodes.F:
                return flipSelectedRelationships(this.selection);

            case KeyCodes.Y:
                return e.shiftKey ? [undo()] : [redo()];

            case KeyCodes.Z:
                return e.shiftKey ? [redo()] : [undo()];

            default:
                return [];
        }
    }
}
