import React, { Component, createRef, HTMLProps, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { UMLElement } from '../../services/uml-element/uml-element';
import { Point } from '../../utils/geometry/point';
import { hoverable } from '../layouted-element/hoverable';
import { styled } from '../theme/styles';
import { CanvasElement } from '../uml-element/canvas-element';

type Props = {
  element: UMLElement;
  create: (element: UMLElement) => void;
};

const initialState = {
  moving: false,
  offset: new Point(),
  position: new Point(),
};

type State = typeof initialState;

export const Preview = styled(hoverable(CanvasElement))`
  margin: 5px;
  overflow: visible;
`;

type GhostProps = {
  position: { x: number; y: number };
};

export const Ghost = styled.div.attrs<GhostProps>(props => ({
  style: { transform: `translate(${props.position.x}px, ${props.position.y}px)` },
}))<GhostProps>`
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
  z-index: 100;
`;

export class PreviewElement extends Component<Props, State> {
  state = initialState;

  ghost: RefObject<HTMLDivElement> = createRef();

  render() {
    const { element } = this.props;

    return (
      <div onPointerDown={this.onPointerDown}>
        <Preview id={element.id} />
        {this.state.moving && createPortal(<Ghost ref={this.ghost} position={this.state.position} />, document.body)}
      </div>
    );
  }

  private onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const bounds = element.getBoundingClientRect();
    element.setPointerCapture(event.pointerId);
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerup', this.onPointerUp, { once: true });
    this.setState({ offset: new Point(event.clientX - bounds.left, event.clientY - bounds.top) });
  };

  private onPointerMove = (event: PointerEvent) => {
    const x = event.pageX - this.state.offset.x;
    const y = event.pageY - this.state.offset.y;
    if (!this.state.moving) {
      const element = event.currentTarget as HTMLDivElement;
      this.setState({ moving: true, position: new Point(x, y) }, () => {
        const container = this.ghost.current as HTMLDivElement;
        container.append(element.cloneNode(true));
      });
    } else {
      this.setState({ position: new Point(x, y) });
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    const element = event.currentTarget as HTMLDivElement;
    if (!element) {
      return;
    }

    element.releasePointerCapture(event.pointerId);
    element.removeEventListener('pointermove', this.onPointerMove);
    if (this.state.moving) {
      this.setState(initialState);
    } else {
      this.props.create(this.props.element);
    }
  };
}
