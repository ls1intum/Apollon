import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import { DraggableContext } from './draggable-context';
import { withDraggable } from './with-draggable';

type Props = {
  children: React.ReactNode;
} & DraggableContext;

const enhance = withDraggable;

class DroppableComponent extends Component<Props> {
  componentDidMount() {
    const node = findDOMNode(this) as HTMLElement;
    node.addEventListener('pointerup', this.props.onDragEnd);
  }

  componentWillUnmount() {
    const node = findDOMNode(this) as HTMLElement;
    node.removeEventListener('pointerup', this.props.onDragEnd);
  }

  render() {
    return this.props.children;
  }
}

export const Droppable = enhance(DroppableComponent);
