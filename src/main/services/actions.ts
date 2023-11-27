import { AssessmentActions } from './assessment/assessment-types';
import { EditorActions } from './editor/editor-types';
import { LayouterActions } from './layouter/layouter-types';
import { UMLContainerActions } from './uml-container/uml-container-types';
import { UMLDiagramActions } from './uml-diagram/uml-diagram-types';
import { ConnectableActions } from './uml-element/connectable/connectable-types';
import { HoverableActions } from './uml-element/hoverable/hoverable-types';
import { InteractableActions } from './uml-element/interactable/interactable-types';
import { MovableActions } from './uml-element/movable/movable-types';
import { MovingActions } from './uml-element/movable/moving-types';
import { ResizableActions } from './uml-element/resizable/resizable-types';
import { ResizingActions } from './uml-element/resizable/resizing-types';
import { SelectableActions } from './uml-element/selectable/selectable-types';
import { RemoteSelectionActions } from './uml-element/remote-selectable/remote-selectable-types';
import { UMLElementActions } from './uml-element/uml-element-types';
import { UpdatableActions } from './uml-element/updatable/updatable-types';
import { ReconnectableActions } from './uml-relationship/reconnectable/reconnectable-types';
import { UMLRelationshipActions } from './uml-relationship/uml-relationship-types';
import { UndoActions } from './undo/undo-types';
import { CopyActions } from './copypaste/copy-types';
import { PatcherActions } from './patcher';

export type Actions =
  | EditorActions
  | LayouterActions
  | PatcherActions
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
  | RemoteSelectionActions
  | UpdatableActions
  | AssessmentActions
  | UndoActions
  | CopyActions;
