import { Store } from "redux";
// import { deleteSelectedElements, duplicateSelectedEntities, flipSelectedRelationships, moveSelectedEntities } from "./handlers";
import { redo, ReduxAction, undo } from "../redux";
import { ElementSelection } from "../../domain/Options/types";
import { State as ReduxState } from './../../components/Store';

export default class KeyboardEventListener {
    private store: Store<ReduxState>;
    // private selectElements: (entityIds: UUID[], relationshipIds: UUID[]) => void;

    private selection: ElementSelection = {
        entityIds: [],
        relationshipIds: []
    };

    constructor(
        store: Store<ReduxState>,
        // selectElements: (entityIds: UUID[], relationshipIds: UUID[]) => void
    ) {
        this.store = store;
        // this.selectElements = selectElements;
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

        switch (e.key) {
            case "ArrowLeft":
                // return moveSelectedEntities(this.selection.entityIds, -state.editor.gridSize, 0);

            case "ArrowUp":
                // return moveSelectedEntities(this.selection.entityIds, 0, -state.editor.gridSize);

            case "ArrowRight":
                // return moveSelectedEntities(this.selection.entityIds, state.editor.gridSize, 0);

            case "ArrowDown":
                // return moveSelectedEntities(this.selection.entityIds, 0, state.editor.gridSize);

            case "Backspace":
            case "Delete":
                // return deleteSelectedElements(this.selection);

            // case "Escape":
            //     return [() => this.selectElements([], [])];
        }

        // All plain-letter keys require the user to also press
        // CTRL or CMD in order to trigger an action
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                // case "a":
                //     return [
                //         () => this.selectElements(state.entities.allIds, state.relationships.allIds)
                //     ];

                case "d":
                    // return duplicateSelectedEntities(this.selection, state);

                case "f":
                    // return flipSelectedRelationships(this.selection);

                case "y":
                    return e.shiftKey ? [undo()] : [redo()];

                case "z":
                    return e.shiftKey ? [redo()] : [undo()];
            }
        }

        return [];
    }
}
