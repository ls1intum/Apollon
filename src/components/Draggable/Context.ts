import React from 'react';
import Draggable from './Draggable';
import { Droppable } from './Droppable';

export interface Context {
  onMouseDown: (element: Draggable) => (event: MouseEvent) => void;
  onMouseUp: (element: Droppable) => (event: MouseEvent) => void;
}

export const { Consumer, Provider } = React.createContext<Context | null>(null);
