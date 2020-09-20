import React from 'react';
import { DropEvent } from './drop-event';

export type DraggableContext = {
  /**
   * a method which is invoked on drag start and returns a promise with the resulting {@link DropEvent}
   * @param event pointer event which started the drag
   */
  onDragStart: (event: PointerEvent) => Promise<DropEvent>;
  onDragEnd: (owner?: string) => (event: PointerEvent) => void;
};

export const { Consumer: DraggableConsumer, Provider: DraggableProvider } = React.createContext<DraggableContext>({
  onDragStart: (event: PointerEvent) => new Promise<DropEvent>((_, reject) => reject()),
  onDragEnd: (owner?: string) => (event: PointerEvent) => {
    return;
  },
});
