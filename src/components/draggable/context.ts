import React from 'react';
import { Draggable } from './draggable';
import { Droppable } from './droppable';

export interface Context {
  onPointerDown: (element: Draggable) => (event: PointerEvent) => void;
  onPointerUp: (element: Droppable) => (event: PointerEvent) => void;
}

export const { Consumer, Provider } = React.createContext<Context | null>(null);
