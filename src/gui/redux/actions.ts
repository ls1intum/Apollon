import { EditorAction } from "./editor/actions";
import { ElementsAction } from "./elements/actions";
import { EntitiesAction } from "./entities/actions";
import { InteractiveElementsAction } from "./interactiveElements/actions";
import { RelationshipsAction } from "./relationships/actions";
import { UndoRedoAction } from "./undoRedo/actions";

export * from "./editor/actions";
export * from "./elements/actions";
export * from "./entities/actions";
export * from "./interactiveElements/actions";
export * from "./relationships/actions";
export * from "./undoRedo/actions";

export type ReduxAction =
    | EditorAction
    | ElementsAction
    | EntitiesAction
    | InteractiveElementsAction
    | RelationshipsAction
    | UndoRedoAction;
