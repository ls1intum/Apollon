import React from 'react';
import { DropEvent } from './drop-event';

export type DraggableContext = {
  /**
   * a method which is invoked on drag start and returns a promise with the resulting {@link DropEvent}
   * @param event pointer event which started the drag
   */
  onDragStart: (event: PointerEvent | TouchEvent) => Promise<DropEvent>;
  onDragEnd: (owner?: string) => (event: PointerEvent | TouchEvent) => void;
};

export const { Consumer: DraggableConsumer, Provider: DraggableProvider } = React.createContext<DraggableContext>({
  onDragStart: (event: PointerEvent | TouchEvent) => new Promise<DropEvent>((_, reject) => reject()),
  onDragEnd: (owner?: string) => (event: PointerEvent | TouchEvent) => {
    return;
  },
});
