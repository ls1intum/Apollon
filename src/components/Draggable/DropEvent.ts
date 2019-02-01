import Draggable from './Draggable';
import Element from '../../domain/Element';

export interface DropAction {
  type: 'CREATE',
  element: Element;
}

interface DropEvent {
  element: Draggable;
  position: { x: number; y: number };
  action: DropAction | null;
}

export default DropEvent;
