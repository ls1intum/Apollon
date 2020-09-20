import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import { DraggableContext } from './draggable-context';
import { withDraggable } from './with-draggable';

type Props = {
  owner?: string;
  children: React.ReactNode;
} & DraggableContext;

const enhance = withDraggable;

/**
 * This component adds events listener to determine when a drop is done
 */
class DroppableComponent extends Component<Props> {
  componentDidMount() {
    const node = findDOMNode(this) as HTMLElement;
    node.addEventListener('pointerup', this.props.onDragEnd(this.props.owner));
  }

  componentWillUnmount() {
    const node = findDOMNode(this) as HTMLElement;
    node.removeEventListener('pointerup', this.props.onDragEnd(this.props.owner));
  }

  render() {
    return this.props.children;
  }
}

export const Droppable = enhance(DroppableComponent);
