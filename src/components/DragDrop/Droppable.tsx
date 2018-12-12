import React, { Component, ComponentClass, RefObject } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import {
  ConnectDropTarget,
  DropTarget,
  DropTargetCollector,
  DropTargetSpec,
} from 'react-dnd';
import * as DragDrop from './../DragDrop/dnd';
import { snapPointToGrid } from './../../core/geometry';
import { createEntity, moveEntities } from './../../gui/redux';
import { State as ReduxState } from './../Store';
import Element, { ElementRepository } from '../../domain/Element';
import { EntityKind } from '../../core/domain';
import * as Plugins from './../../domain/plugins';

class Droppable extends Component<Props> {
  render() {
    const { children, connectDropTarget } = this.props;
    return connectDropTarget(<div>{children}</div>);
  }
}

interface OwnProps {
  container: RefObject<HTMLDivElement>;
}

interface StateProps {
  gridSize: number;
}

interface DispatchProps {
  create: typeof ElementRepository.create;
  moveEntities: typeof moveEntities;
  createEntity: typeof createEntity;
}

interface DragDropProps {
  connectDropTarget: ConnectDropTarget;
}

type Props = OwnProps & StateProps & DispatchProps & DragDropProps;

const mapStateToProps = (state: ReduxState): StateProps => ({
  gridSize: state.editor.gridSize,
});

const dropTargetSpec: DropTargetSpec<Props> = {
  drop(props, monitor, component) {
    if (monitor === undefined || component === undefined) {
      // Should never happen, but let's be defensive
      return;
    }

    const { current } = props.container;

    if (current === null) {
      // Should never happen, but let's be defensive
      return;
    }

    const item = monitor.getItem() as DragDrop.DragItem;

    if (item.type === DragDrop.ItemTypes.NewEntity) {
      const xyCoordOffset = monitor.getSourceClientOffset();
      if (xyCoordOffset != null) {
        const x = xyCoordOffset.x;
        const y = xyCoordOffset.y;
        const canvasRect = current.getBoundingClientRect();
        const positionOnCanvas = {
          x: x - canvasRect.left,
          y: y - canvasRect.top,
        };
        const actualPosition = snapPointToGrid(
          positionOnCanvas,
          props.gridSize
        );

        let clazz: string = 'Class';
        switch (item.kind.toString()) {
          case EntityKind.Class:
            clazz = 'Class';
            break;
          case EntityKind.AbstractClass:
            clazz = 'AbstractClass';
            break;
          case EntityKind.Interface:
            clazz = 'Interface';
            break;
          case EntityKind.Enumeration:
            clazz = 'Enumeration';
            break;
        }
        const element: Element = new (Plugins as { [clazz: string]: any })[clazz](
          item.kind,
          actualPosition,
          item.size
        );
        element.bounds = { ...element.bounds, ...actualPosition };
        props.create(element);
        props.createEntity(element);
      }
    } else if (item.type === DragDrop.ItemTypes.ExistingEntities) {
      const diffFromOffset = monitor.getDifferenceFromInitialOffset();
      if (diffFromOffset != null) {
        const snappedDifference = snapPointToGrid(
          diffFromOffset,
          props.gridSize
        );

        const delta = { dx: snappedDifference.x, dy: snappedDifference.y };

        if (delta.dx !== 0 || delta.dy !== 0) {
          props.moveEntities(item.entityIds, delta);
        }
      }
    }
  },
};

const dropTargetCollector: DropTargetCollector<any> = connector => ({
  connectDropTarget: connector.dropTarget(),
});

export default compose<ComponentClass<OwnProps>>(
  connect<StateProps, DispatchProps, OwnProps, ReduxState>(
    mapStateToProps,
    {
      create: ElementRepository.create,
      createEntity,
      moveEntities,
    }
  ),
  DropTarget<Props>(
    [DragDrop.ItemTypes.NewEntity, DragDrop.ItemTypes.ExistingEntities],
    dropTargetSpec,
    dropTargetCollector
  )
)(Droppable);
