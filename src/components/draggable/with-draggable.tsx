import React, { ComponentType } from 'react';
import { DraggableConsumer, DraggableContext } from './draggable-context';

export const withDraggable = <P extends DraggableContext>(Component: ComponentType<P>) => {
  // Themed Component
  return (props: Pick<P, Exclude<keyof P, keyof DraggableContext>>) => {
    return <DraggableConsumer>{context => <Component {...(props as P)} {...context} />}</DraggableConsumer>;
  };
};
