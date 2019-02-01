export type UndoRedoAction = UndoAction | RedoAction;

interface UndoAction {
    type: "UNDO";
}

interface RedoAction {
    type: "REDO";
}

export function undo(): UndoAction {
    return {
        type: "UNDO"
    };
}

export function redo(): RedoAction {
    return {
        type: "REDO"
    };
}
