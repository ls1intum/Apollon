import React from 'react';
import { DropEvent } from './drop-event';

export type DraggableContext = {
  onDragStart: (event: PointerEvent | TouchEvent) => Promise<DropEvent>;
  onDragEnd: (owner?: string) => (event: PointerEvent | TouchEvent) => void;
};

export const { Consumer: DraggableConsumer, Provider: DraggableProvider } = React.createContext<DraggableContext>({
  onDragStart: (event: PointerEvent | TouchEvent) => new Promise<DropEvent>((_, reject) => reject()),
  onDragEnd: (owner?: string) => (event: PointerEvent | TouchEvent) => {
    return;
  },
});
