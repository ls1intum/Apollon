import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import { DraggableContext } from './draggable-context';
import { DropEvent } from './drop-event';
import { withDraggable } from './with-draggable';

type Props = {
  onDrop?: (event: DropEvent) => void;
  children: React.ReactNode;
} & DraggableContext;

const enhance = withDraggable;

class DraggableComponent extends Component<Props> {
  componentDidMount(): void {
    const node = findDOMNode(this) as HTMLElement;
    node.addEventListener('pointerdown', this.onDragStart);
  }

  componentWillUnmount(): void {
    const node = findDOMNode(this) as HTMLElement;
    node.removeEventListener('pointerdown', this.onDragStart);
  }

  render(): React.ReactNode {
    return this.props.children;
  }

  private onDragStart = async (event: PointerEvent): Promise<void> => {
    try {
      const dropEvent = await this.props.onDragStart(event);
      if (this.props.onDrop) {
        this.props.onDrop(dropEvent);
      }
    } catch (error) {}
  };
}

export const Draggable = enhance(DraggableComponent);
