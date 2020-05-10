import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import { DraggableContext } from './draggable-context';
import { withDraggable } from './with-draggable';

type Props = {
  owner?: string;
  children: React.ReactNode;
} & DraggableContext;

const enhance = withDraggable;

class DroppableComponent extends Component<Props> {
  componentDidMount(): void {
    const node = findDOMNode(this) as HTMLElement;
    node.addEventListener('pointerup', this.props.onDragEnd(this.props.owner));
  }

  componentWillUnmount(): void {
    const node = findDOMNode(this) as HTMLElement;
    node.removeEventListener('pointerup', this.props.onDragEnd(this.props.owner));
  }

  render(): React.ReactNode {
    return this.props.children;
  }
}

export const Droppable = enhance(DroppableComponent);
