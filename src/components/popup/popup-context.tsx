import React, { ComponentType, createContext, SFC } from 'react';
import { Element } from '../../services/element/element';

export interface PopupContext {
  showPopup: (element: Element, position: { x: number; y: number }) => void;
  update: (element: Element) => void;
  dissmiss: () => void;
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
  return C;
};
