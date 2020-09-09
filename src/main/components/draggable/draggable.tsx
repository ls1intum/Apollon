import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import { DraggableContext } from './draggable-context';
import { DropEvent } from './drop-event';
import { withDraggable } from './with-draggable';
import isMobile from 'is-mobile';

type Props = {
  onDrop?: (event: DropEvent) => void;
  children: React.ReactNode;
} & DraggableContext;

const enhance = withDraggable;

class DraggableComponent extends Component<Props> {
  componentDidMount() {
    const node = findDOMNode(this) as HTMLElement;
    if (isMobile({tablet: true})) {
      node.addEventListener('touchstart', this.onDragStart);
    } else {
      node.addEventListener('pointerdown', this.onDragStart);
    }
  }

  componentWillUnmount() {
    const node = findDOMNode(this) as HTMLElement;
    if (isMobile({tablet: true})) {
      node.removeEventListener('touchstart', this.onDragStart);
    } else {
      node.removeEventListener('pointerdown', this.onDragStart);
    }
  }

  render() {
    return this.props.children;
  }

  private onDragStart = async (event: PointerEvent | TouchEvent) => {
    try {
      const dropEvent = await this.props.onDragStart(event);
      if (this.props.onDrop) {
        this.props.onDrop(dropEvent);
      }
    } catch (error) {}
  };
}

export const Draggable = enhance(DraggableComponent);
