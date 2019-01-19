import React from 'react';
import Draggable from './Draggable';
import { Droppable } from './Droppable';

export interface Context {
  onMouseDown: (element: Draggable) => (event: React.MouseEvent) => void;
  onMouseUp: (element: Droppable) => (event: React.MouseEvent) => void;
}

export const { Consumer, Provider } = React.createContext<Context | null>(null);
