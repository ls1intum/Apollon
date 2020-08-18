import React from 'react';
import { DropEvent } from './drop-event';

export type DraggableContext = {
  onDragStart: (event: PointerEvent) => Promise<DropEvent>;
  onDragEnd: (owner?: string) => (event: PointerEvent) => void;
};

export const { Consumer: DraggableConsumer, Provider: DraggableProvider } = React.createContext<DraggableContext>({
  onDragStart: (event: PointerEvent) => new Promise<DropEvent>((_, reject) => reject()),
  onDragEnd: (owner?: string) => (event: PointerEvent) => {
    return;
  },
});
