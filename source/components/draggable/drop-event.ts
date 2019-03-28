import { Draggable } from './draggable';
import { Element } from '../../services/element/element';

export interface DropAction {
  type: 'CREATE';
  element: Element;
}

export interface DropEvent {
  element: Draggable;
  position: { x: number; y: number };
  action: DropAction | null;
}
