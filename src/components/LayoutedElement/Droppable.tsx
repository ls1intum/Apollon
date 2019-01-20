import React, { Component, ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import ElementComponent, { OwnProps } from './ElementComponent';
import { Droppable as DragDroppable, DropEvent } from './../Draggable';
import Container, { ContainerRepository } from '../../domain/Container';
import { withCanvas, CanvasContext } from './../Canvas';

const droppable = (WrappedComponent: typeof ElementComponent) => {
  class Droppable extends Component<Props> {
    onDrop = (event: DropEvent) => {
      if (!event.action) return;
      const container = this.props.element as Container;
      const element = event.action.element;
      const offset = this.props.coordinateSystem.offset();
      const position = this.props.coordinateSystem.screenToPoint(
        event.position.x,
        event.position.y
      );
      element.bounds.x = position.x - offset.x - container.bounds.x;
      element.bounds.y = position.y - offset.y - container.bounds.y;

      this.props.addElement(container, element);
    };

    render() {
      return (
        <DragDroppable onDrop={this.onDrop}>
          <WrappedComponent {...this.props} />
        </DragDroppable>
      );
    }
  }

  interface DispatchProps {
    addElement: typeof ContainerRepository.addElement;
  }

  type Props = OwnProps & DispatchProps & CanvasContext;

  return compose<ComponentClass<OwnProps>>(
    withCanvas,
    connect(
      null,
      {
        addElement: ContainerRepository.addElement,
      }
    )
  )(Droppable);
};

export default droppable;
