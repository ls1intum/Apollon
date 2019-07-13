import React, { Component } from 'react';
import { UMLElement } from '../../services/uml-element/uml-element';
import { Draggable } from '../draggable/draggable';
import { DropEvent } from '../draggable/drop-event';
import { styled } from '../theme/styles';
import { CanvasElement } from '../uml-element/canvas-element';
import { hoverable } from '../uml-element/hoverable/hoverable';

type Props = {
  element: UMLElement;
  create: (element: UMLElement, owner?: string) => void;
};

export const Preview = styled(hoverable(CanvasElement)).attrs({
  child: CanvasElement,
})`
  margin: 5px;
  overflow: visible;
  fill: white;
`;

export class PreviewElement extends Component<Props> {
  render() {
    const { element } = this.props;

    return (
      <Draggable onDrop={this.onDrop}>
        <Preview id={element.id} />
      </Draggable>
    );
  }

  private onDrop = (event: DropEvent) => {
    const element = this.props.element.clone({
      bounds: { ...this.props.element.bounds, ...event.position },
    });
    this.props.create(element, event.owner);
  };
}
