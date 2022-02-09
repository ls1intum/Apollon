import React, { Component } from 'react';
import { UMLElement } from '../../services/uml-element/uml-element.js';
import { Draggable } from '../draggable/draggable.js';
import { DropEvent } from '../draggable/drop-event.js';
import { styled } from '../theme/styles.js';
import { CanvasElement } from '../uml-element/canvas-element.js';
import { hoverable } from '../uml-element/hoverable/hoverable.js';

type Props = {
  element: UMLElement;
  create: (element: UMLElement, owner?: string) => void;
};

export const Preview = styled(hoverable(CanvasElement)).attrs({
  child: CanvasElement,
})`
  margin: 8px;
  overflow: visible;
  fill: white;
`;

export class PreviewElementComponent extends Component<Props> {
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
