import { Element } from '../../services/element/element';
import { Draggable } from './draggable';

export interface DropAction {
  type: 'CREATE';
  element: Element;
}

export interface DropEvent {
  element: Draggable;
  position: { x: number; y: number };
  action: DropAction | null;
}
