import React, { SFC, createContext, ComponentType } from 'react';
import hoistStatics from 'hoist-non-react-statics';
import Element from '../../domain/Element';

export interface PopupContext {
  showPopup: (element: Element) => void;
  update: (element: Element) => void;
}

export const {
  Consumer: PopupConsumer,
  Provider: PopupProvider,
} = createContext<PopupContext | null>(null);

export const withPopup = <Props extends object>(
  Component: ComponentType<Props & PopupContext>
) => {
  const C: SFC<Props> = props => (
    <PopupConsumer
      children={context => context && <Component {...props} {...context} />}
    />
  );

  C.displayName = `withPopup(${Component.displayName || Component.name})`;

  return hoistStatics(C, Component);
};

export default PopupContext;
