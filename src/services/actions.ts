import { AssessmentActions } from './assessment/assessment-types';
import { EditorActions } from './editor/editor-types';
import { LayouterActions } from './layouter/layouter-types';
import { UMLContainerActions } from './uml-container/uml-container-types';
import { ConnectableActions } from './uml-element/connectable/connectable-types';
import { HoverableActions } from './uml-element/hoverable/hoverable-types';
import { InteractableActions } from './uml-element/interactable/interactable-types';
import { MovableActions } from './uml-element/movable/movable-types';
import { MovingActions } from './uml-element/movable/moving-types';
import { ResizableActions } from './uml-element/resizable/resizable-types';
import { ResizingActions } from './uml-element/resizable/resizing-types';
import { SelectableActions } from './uml-element/selectable/selectable-types';
import { UMLElementActions } from './uml-element/uml-element-types';
import { UpdatableActions } from './uml-element/updatable/updatable-types';
import { ReconnectableActions } from './uml-relationship/reconnectable/reconnectable-types';
import { UMLRelationshipActions } from './uml-relationship/uml-relationship-types';

export type Actions = EditorActions &
  LayouterActions &
  UMLContainerActions &
  UMLElementActions &
  UMLRelationshipActions &
  ConnectableActions &
  ReconnectableActions &
  HoverableActions &
  InteractableActions &
  MovableActions &
  MovingActions &
  ResizableActions &
  ResizingActions &
  SelectableActions &
  UpdatableActions &
  AssessmentActions;
