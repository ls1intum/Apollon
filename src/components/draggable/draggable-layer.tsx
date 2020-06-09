import React, { Component, ComponentClass, createRef, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Point } from '../../utils/geometry/point';
import { CanvasContext } from '../canvas/canvas-context';
import { withCanvas } from '../canvas/with-canvas';
import { DraggableContext, DraggableProvider } from './draggable-context';
import { DropEvent } from './drop-event';
import { Ghost } from './ghost';
import { compose } from 'redux';
import { withRoot } from '../root/with-root';
import { RootContext } from '../root/root-context';

type OwnProps = {};

type Props = CanvasContext & RootContext;

const initialState = {
  dragging: false,
  offset: new Point(),
  position: new Point(),
  resolve: null as ((value?: DropEvent) => void) | null,
  reject: null as ((reason?: any) => void) | null,
};

type State = typeof initialState;

const enhance = compose<ComponentClass<OwnProps>>(withCanvas, withRoot);

class DraggableLayerComponent extends Component<Props, State> {
  state = initialState;

  ghost: RefObject<HTMLDivElement> = createRef();

  onDragStart = (event: PointerEvent): Promise<DropEvent> => {
    const element = event.currentTarget as HTMLElement;
    const bounds = element.getBoundingClientRect();
    // bounds of apollon-editor on page
    const rootBounds = this.props.root.getBoundingClientRect();

    const offset = new Point(
      event.clientX - bounds.left + rootBounds.x + window.scrollX,
      event.clientY - bounds.top + rootBounds.y + window.scrollY,
    );
    const position = new Point(event.pageX - offset.x, event.pageY - offset.y);

    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.cancel, { once: true });

    return new Promise<DropEvent>((resolve, reject) =>
      this.setState({ dragging: true, offset, position, resolve, reject }, () => {
        const container = this.ghost.current as HTMLDivElement;
        container.append(element.cloneNode(true));
      }),
    );
  };

  onPointerMove = (event: PointerEvent) => {
    const position = this.props.canvas.snap(
      new Point(event.pageX - this.state.offset.x, event.pageY - this.state.offset.y),
    );
    this.setState({ position });
  };

  onDragEnd = (owner?: string) => (event: PointerEvent) => {
    if (!this.state.dragging) return;

    const dropEvent: DropEvent = {
      owner,
      position: this.state.position
        .subtract(this.props.canvas.origin())
        .subtract(window.scrollX, window.scrollY)
        .add(this.props.root.offsetLeft, this.props.root.offsetTop),
    };

    if (this.state.resolve) {
      this.state.resolve(dropEvent);
    }
  };

  cancel = () => {
    if (this.state.reject) {
      this.state.reject();
    }

    document.removeEventListener('pointermove', this.onPointerMove);
    this.setState(initialState);
  };

  render() {
    const context: DraggableContext = {
      onDragStart: this.onDragStart,
      onDragEnd: this.onDragEnd,
    };
    const { dragging, position } = this.state;
    return (
      <DraggableProvider value={context}>
        {this.props.children}
        {createPortal(dragging && <Ghost ref={this.ghost} position={position} />, this.props.root)}
      </DraggableProvider>
    );
  }
}

export const DraggableLayer = enhance(DraggableLayerComponent);
