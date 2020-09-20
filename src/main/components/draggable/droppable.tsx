import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import { DraggableContext } from './draggable-context';
import { withDraggable } from './with-draggable';
import isMobile from 'is-mobile';

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
    console.log(node);
    if (isMobile({ tablet: true })) {
      node.addEventListener('touchend', this.props.onDragEnd(this.props.owner));
    } else {
      node.addEventListener('pointerup', this.props.onDragEnd(this.props.owner));
    }
  }

  componentWillUnmount() {
    const node = findDOMNode(this) as HTMLElement;
    if (isMobile({ tablet: true })) {
      node.removeEventListener('touchend', this.props.onDragEnd(this.props.owner));
    } else {
      node.removeEventListener('pointerup', this.props.onDragEnd(this.props.owner));
    }
  }

  render() {
    return this.props.children;
  }
}

export const Droppable = enhance(DroppableComponent);
