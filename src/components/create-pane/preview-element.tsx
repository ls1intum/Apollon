import React, { Component } from 'react';
import { UMLElement } from '../../services/uml-element/uml-element';
import { CanvasContext } from '../canvas/canvas-context';
import { withCanvas } from '../canvas/with-canvas';
import { Draggable } from '../draggable/draggable';
import { DropEvent } from '../draggable/drop-event';
import { hoverable } from '../layouted-element/hoverable';
import { styled } from '../theme/styles';
import { CanvasElement } from '../uml-element/canvas-element';

type Props = {
  element: UMLElement;
  create: (element: UMLElement) => void;
} & CanvasContext;

const enhance = withCanvas;

export const Preview = styled(hoverable(CanvasElement))`
  margin: 5px;
  overflow: visible;
`;

class PreviewElementComponent extends Component<Props> {
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
      bounds: { ...event.position },
    });
    this.props.create(element);
  };
}

export const PreviewElement = enhance(PreviewElementComponent);
