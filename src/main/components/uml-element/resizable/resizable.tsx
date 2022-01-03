import React, { Component, ComponentType } from 'react';
import { connect, ConnectedComponent } from 'react-redux';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { Point } from '../../../utils/geometry/point';
import { ModelState } from '../../store/model-state';
import { styled } from '../../theme/styles';
import { UMLElementComponentProps } from '../uml-element-component-props';

type StateProps = {};

type DispatchProps = {
  start: AsyncDispatch<typeof UMLElementRepository.startResizing>;
  resize: AsyncDispatch<typeof UMLElementRepository.resize>;
  end: AsyncDispatch<typeof UMLElementRepository.endResizing>;
  startMoving: AsyncDispatch<typeof UMLElementRepository.startMoving>;
  move: AsyncDispatch<typeof UMLElementRepository.move>;
  endMoving: AsyncDispatch<typeof UMLElementRepository.endMoving>;
};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

const initialState = {
  resizing: false,
  offset: new Point(),
  position: new Point(),
};

type State = typeof initialState;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(null, {
  start: UMLElementRepository.startResizing,
  resize: UMLElementRepository.resize,
  end: UMLElementRepository.endResizing,
  startMoving: UMLElementRepository.startMoving,
  move: UMLElementRepository.move,
  endMoving: UMLElementRepository.endMoving,
});

const HandleBottomRight = styled.rect.attrs({
  x: '100%',
  y: '100%',
  width: 15,
  height: 15,
  transform: 'translate(-10, -10)',
  fill: 'none',
})`
  cursor: nwse-resize;
  pointer-events: all;
`;

const HandleTopLeft = styled.rect.attrs({
  x: '0%',
  y: '0%',
  width: 15,
  height: 15,
  transform: 'translate(-10, -10)',
  fill: 'none',
})`
  cursor: nwse-resize;
  pointer-events: all;
`;

const HandleTopRight = styled.rect.attrs({
  x: '100%',
  y: '0%',
  width: 15,
  height: 15,
  transform: 'translate(-10, -10)',
  fill: 'none',
})`
  cursor: nesw-resize;
  pointer-events: all;
`;

const HandleBottomLeft = styled.rect.attrs({
  x: '0%',
  y: '100%',
  width: 15,
  height: 15,
  transform: 'translate(-10, -10)',
  fill: 'none',
})`
  cursor: nesw-resize;
  pointer-events: all;
`;

export const resizable =
  (options?: { preventX: boolean; preventY: boolean }) =>
  (
    WrappedComponent: ComponentType<UMLElementComponentProps>,
  ): ConnectedComponent<ComponentType<Props>, UMLElementComponentProps> => {
    class Resizable extends Component<Props, State> {
      state = initialState;

      componentWillUnmount() {
        document.removeEventListener('pointermove', this.onTopLeftPointerMove);
        document.removeEventListener('pointerup', this.onTopLeftPointerUp);
        document.removeEventListener('pointermove', this.onBottomRightPointerMove);
        document.removeEventListener('pointerup', this.onBottomRightPointerUp);
        document.removeEventListener('pointermove', this.onTopRightPointerMove);
        document.removeEventListener('pointerup', this.onTopRightPointerUp);
        document.removeEventListener('pointermove', this.onBottomLeftPointerMove);
        document.removeEventListener('pointerup', this.onBottomLeftPointerUp);
      }

      render() {
        const { start, resize, end, startMoving, move, endMoving, ...props } = this.props;
        return (
          <WrappedComponent {...props}>
            {props.children}
            <HandleBottomRight onPointerDown={this.onBottomRightPointerDown} />
            <HandleTopLeft onPointerDown={this.onTopLeftPointerDown} />
            <HandleTopRight onPointerDown={this.onTopRightPointerDown} />
            <HandleBottomLeft onPointerDown={this.onBottomLeftPointerDown} />
          </WrappedComponent>
        );
      }

      private updatePositionTopLeft = (event: PointerEvent | TouchEvent) => {
        let position: Point;
        if (event instanceof PointerEvent) {
          position = new Point(event.pageX + this.state.offset.x, event.pageY + this.state.offset.y);
        } else {
          position = new Point(
            event.targetTouches[0].pageX + this.state.offset.x,
            event.targetTouches[0].pageY + this.state.offset.y,
          );
        }
        position.x = Math.round(position.x / 20) * 20;
        position.y = Math.round(position.y / 20) * 20;
        if (options && options.preventX) position.x = 0;
        if (options && options.preventY) position.y = 0;
        this.props.startMoving();
        this.props.move({ x: position.x, y: position.y });
        this.props.endMoving();
      };

      private updatePositionTopRight = (event: PointerEvent | TouchEvent) => {
        let position: Point;
        if (event instanceof PointerEvent) {
          position = new Point(0, -(-event.pageY - this.state.offset.y));
        } else {
          position = new Point(0, -(-event.targetTouches[0].pageY - this.state.offset.y));
        }
        position.x = Math.round(position.x / 20) * 20;
        position.y = Math.round(position.y / 20) * 20;

        if (options && options.preventX) position.x = 0;
        if (options && options.preventY) position.y = 0;
        this.props.startMoving();
        this.props.move({ x: position.x, y: position.y });
        this.props.endMoving();
      };

      private updatePositionBottomLeft = (event: PointerEvent | TouchEvent) => {
        let position: Point;
        if (event instanceof PointerEvent) {
          position = new Point(-(-event.pageX - this.state.offset.x), 0);
        } else {
          position = new Point(-(-event.targetTouches[0].pageX - this.state.offset.x), 0);
        }
        position.x = Math.round(position.x / 20) * 20;
        position.y = Math.round(position.y / 20) * 20;

        if (options && options.preventX) position.x = 0;
        if (options && options.preventY) position.y = 0;
        this.props.startMoving();
        this.props.move({ x: position.x, y: position.y });
        this.props.endMoving();
      };

      private resizeTopLeft = (width: number, height: number, event: PointerEvent) => {
        width = Math.round(width / 20) * 20;
        height = Math.round(height / 20) * 20;
        if (options && options.preventX) width = 0;
        if (options && options.preventY) height = 0;
        if (width === 0 && height === 0) return;

        this.updatePositionTopLeft(event);
        this.setState((state) => ({ offset: state.offset.add(width, height) }));
        this.props.resize({ width, height });
      };

      private resizeBottomRight = (width: number, height: number, event: PointerEvent) => {
        width = Math.round(width / 20) * 20;
        height = Math.round(height / 20) * 20;
        if (options && options.preventX) width = 0;
        if (options && options.preventY) height = 0;
        if (width === 0 && height === 0) return;

        this.setState((state) => ({ offset: state.offset.add(width, height) }));
        this.props.resize({ width, height });
      };

      private resizeTopRight = (width: number, height: number, event: PointerEvent) => {
        width = Math.round(width / 20) * 20;
        height = Math.round(height / 20) * 20;
        if (options && options.preventX) width = 0;
        if (options && options.preventY) height = 0;
        if (width === 0 && height === 0) return;

        this.updatePositionTopRight(event);
        this.setState((state) => ({ offset: state.offset.add(width, height) }));
        this.props.resize({ width, height });
      };

      private resizeBottomLeft = (width: number, height: number, event: PointerEvent) => {
        width = Math.round(width / 20) * 20;
        height = Math.round(height / 20) * 20;
        if (options && options.preventX) width = 0;
        if (options && options.preventY) height = 0;
        if (width === 0 && height === 0) return;

        this.updatePositionBottomLeft(event);
        this.setState((state) => ({ offset: state.offset.add(width, height) }));
        this.props.resize({ width, height });
      };

      private onTopLeftPointerDown = (event: React.PointerEvent<SVGElement>) => {
        if (event.nativeEvent.which && event.nativeEvent.which !== 1) {
          return;
        }

        this.setState({ resizing: true, offset: new Point(-event.clientX, -event.clientY) });
        this.props.start();
        const element = event.currentTarget;
        element.setPointerCapture(event.pointerId);
        element.addEventListener('pointermove', this.onTopLeftPointerMove);
        element.addEventListener('pointerup', this.onTopLeftPointerUp, { once: true });
      };

      private onBottomRightPointerDown = (event: React.PointerEvent<SVGElement>) => {
        if (event.nativeEvent.which && event.nativeEvent.which !== 1) {
          return;
        }

        this.setState({ resizing: true, offset: new Point(event.clientX, event.clientY) });
        this.props.start();
        const element = event.currentTarget;
        element.setPointerCapture(event.pointerId);
        element.addEventListener('pointermove', this.onBottomRightPointerMove);
        element.addEventListener('pointerup', this.onBottomRightPointerUp, { once: true });
      };

      private onTopRightPointerDown = (event: React.PointerEvent<SVGElement>) => {
        if (event.nativeEvent.which && event.nativeEvent.which !== 1) {
          return;
        }

        this.setState({ resizing: true, offset: new Point(event.clientX, -event.clientY) });
        this.props.start();
        const element = event.currentTarget;
        element.setPointerCapture(event.pointerId);
        element.addEventListener('pointermove', this.onTopRightPointerMove);
        element.addEventListener('pointerup', this.onTopRightPointerUp, { once: true });
      };

      private onBottomLeftPointerDown = (event: React.PointerEvent<SVGElement>) => {
        if (event.nativeEvent.which && event.nativeEvent.which !== 1) {
          return;
        }

        this.setState({ resizing: true, offset: new Point(-event.clientX, event.clientY) });
        this.props.start();
        const element = event.currentTarget;
        element.setPointerCapture(event.pointerId);
        element.addEventListener('pointermove', this.onBottomLeftPointerMove);
        element.addEventListener('pointerup', this.onBottomLeftPointerUp, { once: true });
      };

      private onTopLeftPointerMove = (event: PointerEvent) => {
        const width = -event.clientX - this.state.offset.x;
        const height = -event.clientY - this.state.offset.y;
        this.resizeTopLeft(width, height, event);
        event.stopPropagation();
      };

      private onBottomRightPointerMove = (event: PointerEvent) => {
        const width = event.clientX - this.state.offset.x;
        const height = event.clientY - this.state.offset.y;
        this.resizeBottomRight(width, height, event);
        event.stopPropagation();
      };

      private onTopRightPointerMove = (event: PointerEvent) => {
        const width = event.clientX - this.state.offset.x;
        const height = -event.clientY - this.state.offset.y;
        this.resizeTopRight(width, height, event);
        event.stopPropagation();
      };

      private onBottomLeftPointerMove = (event: PointerEvent) => {
        const width = -event.clientX - this.state.offset.x;
        const height = event.clientY - this.state.offset.y;
        this.resizeBottomLeft(width, height, event);
        event.stopPropagation();
      };

      private onTopLeftPointerUp = (event: PointerEvent) => {
        const element = event.currentTarget as HTMLDivElement;
        if (!element) {
          return;
        }

        element.releasePointerCapture(event.pointerId);
        element.removeEventListener('pointermove', this.onTopLeftPointerMove);
        this.setState(initialState);
        this.props.end();
        event.stopPropagation();
      };

      private onBottomRightPointerUp = (event: PointerEvent) => {
        const element = event.currentTarget as HTMLDivElement;
        if (!element) {
          return;
        }

        element.releasePointerCapture(event.pointerId);
        element.removeEventListener('pointermove', this.onBottomRightPointerMove);
        this.setState(initialState);
        this.props.end();
        event.stopPropagation();
      };

      private onTopRightPointerUp = (event: PointerEvent) => {
        const element = event.currentTarget as HTMLDivElement;
        if (!element) {
          return;
        }

        element.releasePointerCapture(event.pointerId);
        element.removeEventListener('pointermove', this.onTopRightPointerMove);
        this.setState(initialState);
        this.props.end();
        event.stopPropagation();
      };

      private onBottomLeftPointerUp = (event: PointerEvent) => {
        const element = event.currentTarget as HTMLDivElement;
        if (!element) {
          return;
        }

        element.releasePointerCapture(event.pointerId);
        element.removeEventListener('pointermove', this.onBottomLeftPointerMove);
        this.setState(initialState);
        this.props.end();
        event.stopPropagation();
      };
    }

    return enhance(Resizable);
  };
