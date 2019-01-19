import Draggable from './Draggable';

interface DropEvent {
  element: Draggable;
  position: { x: number; y: number };
}

export default DropEvent;
