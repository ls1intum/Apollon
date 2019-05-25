import React, { Component, ComponentClass } from 'react';
import { Droppable as DragDroppable } from '../draggable/droppable';
import { ElementComponent, OwnProps } from './element-component';

type Props = OwnProps;

export const droppable = (WrappedComponent: typeof ElementComponent): ComponentClass<OwnProps> => {
  return class Droppable extends Component<Props> {
    render() {
      return (
        <DragDroppable owner={this.props.id}>
          <WrappedComponent {...this.props} />
        </DragDroppable>
      );
    }
  };
};
