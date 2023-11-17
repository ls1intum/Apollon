import React, { Component, ComponentType, forwardRef } from 'react';
import { RootConsumer, RootContext } from './root-context';

export const withRoot = <P extends RootContext, C extends Component>(WrappedComponent: ComponentType<P>) =>
  forwardRef<C, Pick<P, Exclude<keyof P, keyof RootContext>>>((props, ref) => (
    <RootConsumer>{(context) => <WrappedComponent ref={ref} {...(props as P)} {...context} />}</RootConsumer>
  ));
