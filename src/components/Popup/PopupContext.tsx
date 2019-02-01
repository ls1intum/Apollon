import React, { SFC, createContext, ComponentType } from 'react';
import hoistStatics from 'hoist-non-react-statics';
import Element from '../../domain/Element';
import { LayoutedRelationship } from '../../domain/Relationship';

export interface PopupContext {
  showPopup: (element: Element) => void;
  showRelationshipPopup: (element: LayoutedRelationship) => void;
  update: (element: Element) => void;
  updateRelationship: (element: LayoutedRelationship) => void;
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
