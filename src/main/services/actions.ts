import { AssessmentActions } from './assessment/assessment-types.js';
import { EditorActions } from './editor/editor-types.js';
import { LayouterActions } from './layouter/layouter-types.js';
import { UMLContainerActions } from './uml-container/uml-container-types.js';
import { UMLDiagramActions } from './uml-diagram/uml-diagram-types.js';
import { ConnectableActions } from './uml-element/connectable/connectable-types.js';
import { HoverableActions } from './uml-element/hoverable/hoverable-types.js';
import { InteractableActions } from './uml-element/interactable/interactable-types.js';
import { MovableActions } from './uml-element/movable/movable-types.js';
import { MovingActions } from './uml-element/movable/moving-types.js';
import { ResizableActions } from './uml-element/resizable/resizable-types.js';
import { ResizingActions } from './uml-element/resizable/resizing-types.js';
import { SelectableActions } from './uml-element/selectable/selectable-types.js';
import { UMLElementActions } from './uml-element/uml-element-types.js';
import { UpdatableActions } from './uml-element/updatable/updatable-types.js';
import { ReconnectableActions } from './uml-relationship/reconnectable/reconnectable-types.js';
import { UMLRelationshipActions } from './uml-relationship/uml-relationship-types.js';
import { UndoActions } from './undo/undo-types.js';
import { CopyActions } from './copypaste/copy-types.js';

export type Actions =
  | EditorActions
  | LayouterActions
  | UMLContainerActions
  | UMLElementActions
  | UMLRelationshipActions
  | UMLDiagramActions
  | ConnectableActions
  | ReconnectableActions
  | HoverableActions
  | InteractableActions
  | MovableActions
  | MovingActions
  | ResizableActions
  | ResizingActions
  | SelectableActions
  | UpdatableActions
  | AssessmentActions
  | UndoActions
  | CopyActions;
