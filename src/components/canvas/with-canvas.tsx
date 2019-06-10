import React, { ComponentType } from 'react';
import { CanvasConsumer } from './canvas-context';
import { CoordinateSystem } from './coordinate-system';

export const withCanvas = <P extends CoordinateSystem>(Component: ComponentType<P>) => (
  props: Pick<P, Exclude<keyof P, keyof CoordinateSystem>>,
) => <CanvasConsumer>{context => <Component {...props as P} {...context} />}</CanvasConsumer>;
