import React, { Component, ComponentType, forwardRef } from 'react';
import { CanvasConsumer, CanvasContext } from './canvas-context';

export const withCanvas = <P extends CanvasContext, C extends Component>(WrappedComponent: ComponentType<P>) =>
  forwardRef<C, Pick<P, Exclude<keyof P, keyof CanvasContext>>>((props, ref) => (
    <CanvasConsumer>{(context) => <WrappedComponent ref={ref} {...(props as P)} {...context} />}</CanvasConsumer>
  ));
