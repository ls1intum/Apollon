import { UMLElement } from '../../services/uml-element/uml-element';
import { Draggable } from './draggable';

export interface DropAction {
  type: 'CREATE';
  element: UMLElement;
}

export interface DropEvent {
  element: Draggable;
  position: { x: number; y: number };
  action: DropAction | null;
}
