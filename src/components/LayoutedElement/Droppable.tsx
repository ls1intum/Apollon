import React, { Component, ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { ModelState } from './../Store';
import ElementComponent, { OwnProps } from './ElementComponent';
import { Droppable as DragDroppable, DropEvent } from './../Draggable';
import { withCanvas, CanvasContext } from './../Canvas';
import { Element, ElementRepository } from '../../services/element';

const droppable = (WrappedComponent: typeof ElementComponent) => {
  class Droppable extends Component<Props> {
    onDrop = (event: DropEvent) => {
      if (!event.action) return;
      const element = event.action.element;
      element.owner = this.props.element.id;
      const offset = this.props.coordinateSystem.offset();
      const position = this.props.coordinateSystem.screenToPoint(
        event.position.x,
        event.position.y
      );
      element.bounds.x = position.x - offset.x;
      element.bounds.y = position.y - offset.y;

      let ownerID: string | null = this.props.element.id;
      while (ownerID) {
        const owner = this.props.getById(ownerID);
        if (!owner) break;
        element.bounds.x -= owner.bounds.x;
        element.bounds.y -= owner.bounds.y;
        ownerID = owner.owner;
      }

      this.props.create(element);
    };

    render() {
      return (
        <DragDroppable onDrop={this.onDrop}>
          <WrappedComponent {...this.props} />
        </DragDroppable>
      );
    }
  }

  interface StateProps {
    getById: (id: string) => Element | null;
  }

  interface DispatchProps {
    create: typeof ElementRepository.create;
  }

  type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

  return compose<ComponentClass<OwnProps>>(
    withCanvas,
    connect<StateProps, DispatchProps, OwnProps, ModelState>(
      state => ({ getById: ElementRepository.getById(state.elements) }),
      { create: ElementRepository.create }
    )
  )(Droppable);
};

export default droppable;
