import { EditorAction } from "./editor/actions";
import { InteractiveElementsAction } from "./interactiveElements/actions";
import { RelationshipsAction } from "./relationships/actions";
import { UndoRedoAction } from "./undoRedo/actions";

import { Actions } from './../../domain/Element/repository'

export * from "./editor/actions";
export * from "./interactiveElements/actions";
export * from "./relationships/actions";
export * from "./undoRedo/actions";

export type ReduxAction =
    | EditorAction
    | InteractiveElementsAction
    | RelationshipsAction
    | UndoRedoAction
    | Actions;
