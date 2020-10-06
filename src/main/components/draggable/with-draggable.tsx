import React, { ComponentType } from 'react';
import { DraggableConsumer, DraggableContext } from './draggable-context';

/**
 * used to add DraggableContext properties to component properties, i.e. {@link DraggableContext.onDragStart} and {@link DraggableContext.onDragEnd}
 * @param Component which needs access to the props of DraggableContext
 */
export function withDraggable<P extends DraggableContext>(Component: ComponentType<P>) {
  return function ThemedComponent(props: Pick<P, Exclude<keyof P, keyof DraggableContext>>) {
    return <DraggableConsumer>{(context) => <Component {...(props as P)} {...context} />}</DraggableConsumer>;
  };
}
