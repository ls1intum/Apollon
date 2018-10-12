import { Reducer, ReduxAction, ReduxState } from ".";

const MAX_UNDO_STACK_SIZE = 25;

export function withUndoRedo(reducer: Reducer<ReduxState>) {
    const undoStack = new Stack<ReduxState>(MAX_UNDO_STACK_SIZE);
    const redoStack = new Stack<ReduxState>(MAX_UNDO_STACK_SIZE);

    return (state: ReduxState, action: ReduxAction): ReduxState => {
        if (action.type === "UNDO") {
            const prevState = undoStack.pop();

            if (prevState === undefined) {
                return state;
            }

            redoStack.push(state);

            return prevState;
        }

        if (action.type === "REDO") {
            const nextState = redoStack.pop();

            if (nextState === undefined) {
                return state;
            }

            undoStack.push(state);

            return nextState;
        }

        redoStack.clear();
        undoStack.push(state);

        return reducer(state, action);
    };
}

class Stack<T> {
    private _maxSize: number;
    private _items: T[];

    constructor(maxSize: number) {
        this._maxSize = maxSize;
        this._items = [];
    }

    push(item: T) {
        const newLength = this._items.push(item);
        if (newLength > this._maxSize) {
            this._items.shift();
        }
    }

    pop() {
        return this._items.pop();
    }

    clear() {
        this._items.length = 0;
    }
}
