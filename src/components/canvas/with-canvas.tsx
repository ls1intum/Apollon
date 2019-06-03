import React, { ComponentType } from 'react';
import { CanvasConsumer } from './canvas-context';
import { CoordinateSystem } from './coordinate-system';

export function withCanvas<P extends CoordinateSystem>(Component: ComponentType<P>) {
  return function ThemedComponent(props: Pick<P, Exclude<keyof P, keyof CoordinateSystem>>) {
    return <CanvasConsumer>{context => <Component {...props as P} {...context} />}</CanvasConsumer>;
  };
}
