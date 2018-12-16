import React, { Component } from 'react';
import {
  ConnectDragPreview,
  ConnectDragSource,
  DragSourceSpec,
  DragSourceCollector,
  DragSource,
} from 'react-dnd';
import * as DragDrop from './dnd';
import { EntityKind } from '../../core/domain';

class Draggable extends Component<Props> {
  render() {
    return this.props.connectDragSource(<div>{this.props.children}</div>);
  }
}

interface OwnProps {
  kind: EntityKind;
}

interface DragDropProps {
  connectDragPreview: ConnectDragPreview;
  connectDragSource: ConnectDragSource;
  isDragging: boolean;
}

type Props = OwnProps & DragDropProps;

const dragSourceSpec: DragSourceSpec<OwnProps, any> = {
  beginDrag(props): DragDrop.DragItem {
    return {
      type: DragDrop.ItemTypes.NewEntity,
      kind: props.kind,
      size: {
        width: 110,
        height: 80,
      },
    };
  },
};

const dragSourceCollector: DragSourceCollector<any> = (
  connector,
  monitor
): DragDropProps => ({
  connectDragPreview: connector.dragPreview(),
  connectDragSource: connector.dragSource(),
  isDragging: monitor.isDragging(),
});

export default DragSource<OwnProps>(
  DragDrop.ItemTypes.NewEntity,
  dragSourceSpec,
  dragSourceCollector
)(Draggable);
