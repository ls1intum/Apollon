import React, { ComponentType } from 'react';
import { DraggableConsumer, DraggableContext } from './draggable-context';

export function withDraggable<P extends DraggableContext>(Component: ComponentType<P>) {
  return function ThemedComponent(props: Pick<P, Exclude<keyof P, keyof DraggableContext>>) {
    return <DraggableConsumer>{(context) => <Component {...(props as P)} {...context} />}</DraggableConsumer>;
  };
}
