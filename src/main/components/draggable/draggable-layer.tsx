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
import isMobile from 'is-mobile';

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

  onDragStart = (event: PointerEvent | TouchEvent): Promise<DropEvent> => {
    const element = event.currentTarget as HTMLElement;
    const bounds = element.getBoundingClientRect();
    const rootBounds = this.props.root.getBoundingClientRect();
    // bounds.left - rooBounds.x => position to origin
    // one could delete event.pageX (a - a = 0)in for this case, but its is important to calculate the offset correctly for moving event
    let offset: Point;
    let position: Point;
    if (event instanceof TouchEvent) {
      offset = new Point(
        event.targetTouches[0].pageX - (bounds.left - rootBounds.x),
        event.targetTouches[0].pageY - (bounds.top - rootBounds.y),
      );
      position = new Point(
        Math.round((event.targetTouches[0].pageX - offset.x) / 10) * 10,
        Math.round((event.targetTouches[0].pageY - offset.y) / 10) * 10,
      );
    } else {
      offset = new Point(event.pageX - (bounds.left - rootBounds.x), event.pageY - (bounds.top - rootBounds.y));
      position = new Point(
        Math.round((event.pageX - offset.x) / 10) * 10,
        Math.round((event.pageY - offset.y) / 10) * 10,
      );
    }

    if (isMobile({ tablet: true })) {
      document.addEventListener('touchmove', this.onPointerMove);
      document.addEventListener('touchcancel', this.cancel, { once: true });
    } else {
      document.addEventListener('pointermove', this.onPointerMove);
      document.addEventListener('pointerup', this.cancel, { once: true });
    }

    return new Promise<DropEvent>((resolve, reject) =>
      this.setState({ dragging: true, offset, position, resolve, reject }, () => {
        const container = this.ghost.current as HTMLDivElement;
        container.append(element.cloneNode(true));
      }),
    );
  };

  onPointerMove = (event: PointerEvent | TouchEvent) => {
    let position: Point;
    if (event instanceof TouchEvent) {
      position = new Point(
        event.targetTouches[0].pageX - this.state.offset.x,
        event.targetTouches[0].pageY - this.state.offset.y,
      );
    } else {
      position = new Point(event.pageX - this.state.offset.x, event.pageY - this.state.offset.y);
    }
    // snapping behavior on moving
    position.x = Math.round(position.x / 10) * 10;
    position.y = Math.round(position.y / 10) * 10;
    this.setState({ position });
  };

  onDragEnd = (owner?: string) => (event: PointerEvent | TouchEvent) => {
    if (!this.state.dragging) return;
    const dropEvent: DropEvent = {
      owner,
      // transformation to new relational point origin, which is in the center of the canvas
      position: this.state.position.subtract(
        this.props.canvas
          .origin()
          .subtract(this.props.root.getBoundingClientRect().x, this.props.root.getBoundingClientRect().y),
      ),
    };

    // snapping behavior when dropped
    dropEvent.position.x = Math.round(dropEvent.position.x / 10) * 10;
    dropEvent.position.y = Math.round(dropEvent.position.y / 10) * 10;

    if (this.state.resolve) {
      this.state.resolve(dropEvent);
    }
    if (isMobile({ tablet: true })) {
      this.cancel();
    }
  };

  cancel = () => {
    if (this.state.reject) {
      this.state.reject();
    }

    if (isMobile({ tablet: true })) {
      document.removeEventListener('touchmove', this.onPointerMove);
    } else {
      document.removeEventListener('pointermove', this.onPointerMove);
    }
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
