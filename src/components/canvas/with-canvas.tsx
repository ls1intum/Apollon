import React, { ComponentType } from 'react';
import { CanvasConsumer, CanvasContext } from './canvas-context';

export function withCanvas<P extends CanvasContext>(Component: ComponentType<P>) {
  return function ThemedComponent(props: Pick<P, Exclude<keyof P, keyof CanvasContext>>) {
    return <CanvasConsumer>{context => <Component {...props as P} {...context} />}</CanvasConsumer>;
  };
}
