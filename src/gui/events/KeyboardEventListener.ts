import { Store } from "redux";
import { redo, ReduxAction, undo } from "../redux";
import { State as ReduxState } from './../../components/Store';

export default class KeyboardEventListener {
    private store: Store<ReduxState>;

    constructor(
        store: Store<ReduxState>,
    ) {
        this.store = store;
    }

    startListening() {
        document.addEventListener("keydown", this.handleKeyDownEvent);
    }

    stopListening() {
        document.removeEventListener("keydown", this.handleKeyDownEvent);
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
        // All plain-letter keys require the user to also press
        // CTRL or CMD in order to trigger an action
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {

                case "y":
                    return e.shiftKey ? [undo()] : [redo()];

                case "z":
                    return e.shiftKey ? [redo()] : [undo()];
            }
        }

        return [];
    }
}
