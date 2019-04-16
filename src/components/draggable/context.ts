import React from 'react';
import { Draggable } from './draggable';
import { Droppable } from './droppable';

export interface Context {
  onMouseDown: (element: Draggable) => (event: PointerEvent) => void;
  onMouseUp: (element: Droppable) => (event: PointerEvent) => void;
}

export const { Consumer, Provider } = React.createContext<Context | null>(null);
