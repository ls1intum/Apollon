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
import { snapPointToGrid } from '../../domain/geo';
import { State as ReduxState } from './../Store';
import Element, { ElementRepository, EntityKind } from '../../domain/Element';
import * as Plugins from './../../domain/plugins';
import Attribute from './../../domain/plugins/class/Attribute';
import Container from '../../domain/Container';

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

        let elements: Element[] = [];
        switch (item.kind) {
          case EntityKind.Enumeration:
            const enumInstance: Container = new (Plugins as { [clazz: string]: any })[
              item.kind
            ]();
            enumInstance.bounds = { ...enumInstance.bounds, ...actualPosition };
            const attr1 = new Attribute('Case1');
            attr1.bounds.y = 50;
            attr1.owner = enumInstance.id;
            const attr2 = new Attribute('Case2');
            attr2.bounds.y = 80;
            attr2.owner = enumInstance.id;
            const attr3 = new Attribute('Case3');
            attr3.bounds.y = 110;
            attr3.owner = enumInstance.id;
            enumInstance.ownedElements = [attr1.id, attr2.id, attr3.id];
            elements = [attr1, attr2, attr3, enumInstance];
            break;
        }

        if (elements.length) {
          console.log('new elements', elements);
          elements.map(props.create);
          return
        }

        const element: Element = new (Plugins as { [clazz: string]: any })[
          item.kind
        ]();
        // const elements = [...element.ownedElements, element]
        element.bounds = { ...element.bounds, ...actualPosition };
        props.create(element);
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
    }
  ),
  DropTarget<Props>(
    [DragDrop.ItemTypes.NewEntity, DragDrop.ItemTypes.ExistingEntities],
    dropTargetSpec,
    dropTargetCollector
  )
)(Droppable);
