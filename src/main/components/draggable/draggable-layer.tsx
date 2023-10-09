import React, { Component, ComponentClass, createRef, PropsWithChildren, RefObject } from 'react';
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
import { connect } from 'react-redux';
import { ModelState } from '../store/model-state';

type OwnProps = {};

type StateProps = {
  zoomFactor: number;
};

type DispatchProps = {};

type Props = StateProps & CanvasContext & RootContext;

const initialState = {
  dragging: false,
  offset: new Point(),
  position: new Point(),
  resolve: null as ((value: DropEvent | PromiseLike<DropEvent>) => void) | null,
  reject: null as ((reason?: any) => void) | null,
};

type State = typeof initialState;

const enhance = compose<ComponentClass<OwnProps>>(
  withCanvas,
  withRoot,
  connect<StateProps, DispatchProps, OwnProps, ModelState>((state) => ({
    zoomFactor: state.editor.zoomFactor,
  })),
);

/**
 * Manages the intermediate state of drag and drop events.
 * On drag start it adds the dragged HTMLElement to the ghost (container with dragged HTMLElement)
 * and thereby a preview of the HTML element is displayed.
 * On moving around it updates the position of the ghost element
 * On drag end (invoked on pointerup in droppable) it takes the current position of the ghost element and
 * creates a {@link DropEvent} with the last position of the ghost
 */
class DraggableLayerComponent extends Component<PropsWithChildren & Props, State> {
  state = initialState;

  ghost: RefObject<HTMLDivElement> = createRef();

  /**
   * 'implementation' of the onDragStart of {@link DraggableContext}. It returns a promise with the resulting {@link DropEvent}.
   * The by this method returned promise is resolved in the {@link onDragEnd} method where the final drop is created. If a pointerup event
   * occurs outside of the Droppable component -> {@link cancel} is invoked which terminates the dragging and rejects the promise
   * @param event that started the dragging
   */
  onDragStart = (event: PointerEvent | TouchEvent): Promise<DropEvent> => {
    const element = event.currentTarget as HTMLElement;
    const bounds = element.getBoundingClientRect();
    const rootBounds = this.props.root.getBoundingClientRect();
    // bounds.left - rooBounds.x => position to origin
    // one could delete event.pageX (a - a = 0)in for this case, but its is important to calculate the offset correctly for moving event
    let offset: Point;
    let position: Point;
    if (event instanceof PointerEvent) {
      offset = new Point(event.pageX - (bounds.left - rootBounds.x), event.pageY - (bounds.top - rootBounds.y));
      position = new Point(
        Math.round((event.pageX - offset.x) / 10) * 10,
        Math.round((event.pageY - offset.y) / 10) * 10,
      );
    } else {
      offset = new Point(
        event.targetTouches[0].pageX - (bounds.left - rootBounds.x),
        event.targetTouches[0].pageY - (bounds.top - rootBounds.y),
      );
      position = new Point(
        Math.round((event.targetTouches[0].pageX - offset.x) / 10) * 10,
        Math.round((event.targetTouches[0].pageY - offset.y) / 10) * 10,
      );
    }

    if (isMobile({ tablet: true })) {
      document.addEventListener('touchmove', this.onPointerMove);
      document.addEventListener('touchend', this.cancel, { once: true });
    } else {
      document.addEventListener('pointermove', this.onPointerMove);
      // if pointer up event occur outside of Droppable element -> cancel dragging
      // this works, because the events bubble up (onDragEnd is invoked before cancel)
      // nevertheless cancel is important, because it removes the pointerup listener on the documentdocument.addEventListener('pointerup', this.cancel, { once: true });
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
    if (event instanceof PointerEvent) {
      position = new Point(event.pageX - this.state.offset.x, event.pageY - this.state.offset.y);
    } else {
      position = new Point(
        event.targetTouches[0].pageX - this.state.offset.x,
        event.targetTouches[0].pageY - this.state.offset.y,
      );
    }
    // snapping behavior on moving
    position.x = Math.round(position.x / 10) * 10;
    position.y = Math.round(position.y / 10) * 10;
    this.setState({ position });
  };

  onDragEnd = (owner?: string) => (event: PointerEvent | TouchEvent) => {
    const { zoomFactor = 1 } = this.props;

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
    dropEvent.position.x = Math.round(dropEvent.position.x / zoomFactor / 10) * 10;
    dropEvent.position.y = Math.round(dropEvent.position.y / zoomFactor / 10) * 10;

    if (this.state.resolve) {
      this.state.resolve(dropEvent);
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
