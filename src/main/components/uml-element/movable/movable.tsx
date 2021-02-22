import React, { Component, ComponentType } from 'react';
import { findDOMNode } from 'react-dom';
import { connect, ConnectedComponent } from 'react-redux';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { Point } from '../../../utils/geometry/point';
import { ModelState } from '../../store/model-state';
import { UMLElementComponentProps } from '../uml-element-component-props';
import isMobile from 'is-mobile';
import { getClientEventCoordinates } from '../../../utils/touch-event';
import { IUMLElement } from '../../../services/uml-element/uml-element';

type StateProps = {
  movable: boolean;
  moving: boolean;
  element: IUMLElement;
  numberOfElements: number;
  performance: number;
};

type DispatchProps = {
  start: AsyncDispatch<typeof UMLElementRepository.startMoving>;
  move: AsyncDispatch<typeof UMLElementRepository.move>;
  end: AsyncDispatch<typeof UMLElementRepository.endMoving>;
};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

const initialState = {
  offset: new Point(),
  pos: { x: 0, y: 0, width: 200, height: 100 },
  moving: false,
};

type State = typeof initialState;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(
  (state, props) => ({
    movable: state.selected.includes(props.id) && !state.resizing.includes(props.id) && !state.connecting.length,
    moving: state.moving.includes(props.id),
    element: state.elements[props.id],
    numberOfElements: Object.keys(state.elements).length,
    performance: state.editor.performance,
  }),
  {
    start: UMLElementRepository.startMoving,
    move: UMLElementRepository.move,
    end: UMLElementRepository.endMoving,
  },
);

export const movable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ConnectedComponent<ComponentType<Props>, UMLElementComponentProps> => {
  class Movable extends Component<Props, State> {
    state = { ...initialState, pos: this.props.element.bounds };
    moveWindow: { x: number; y: number } = { x: 0, y: 0 };
    animationFrame: any;
    move = (x: number, y: number) => {
      x = Math.round(x / 10) * 10;
      y = Math.round(y / 10) * 10;
      if (x === 0 && y === 0) return;

      this.setState((state) => ({ offset: state.offset.add(x, y) }));
      this.moveWindow = { x: this.moveWindow.x + x, y: this.moveWindow.y + y };
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      this.animationFrame = requestAnimationFrame(this.animate);
    };

    private animate = (time: any) => {
      if (this.shouldNotUpdateReduxWhileMoving()) {
        this.setState((state) => ({
          pos: { ...this.props.element.bounds, x: state.pos.x + this.moveWindow.x, y: state.pos.y + this.moveWindow.y },
        }));
      } else {
        this.props.move(this.moveWindow);
      }
      this.moveWindow = { x: 0, y: 0 };
      this.animationFrame = requestAnimationFrame(this.animate);
    };

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.style.cursor = 'move';
      const child = node.firstChild as HTMLElement;
      if (isMobile({ tablet: true })) {
        child.addEventListener('touchstart', this.onPointerDown);
      } else {
        child.addEventListener('pointerdown', this.onPointerDown);
      }
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      const child = node.firstChild as HTMLElement;

      if (isMobile({ tablet: true })) {
        child.removeEventListener('touchstart', this.onPointerDown);
        document.removeEventListener('touchmove', this.onPointerMove);
        document.removeEventListener('touchend', this.onPointerUp);
      } else {
        child.removeEventListener('pointerdown', this.onPointerDown);
        document.removeEventListener('pointermove', this.onPointerMove);
        document.removeEventListener('pointerup', this.onPointerUp);
      }
    }

    render() {
      const { movable: _, start, move, end, numberOfElements, performance, element, ...props } = this.props;
      return this.shouldNotUpdateReduxWhileMoving() && this.props.moving && (this.state.pos.x || this.state.pos.y) ? (
        <WrappedComponent {...{ pos: this.state.pos }} {...props} />
      ) : (
        <WrappedComponent {...props} />
      );
    }

    private onPointerDown = (event: PointerEvent | TouchEvent) => {
      if (event.which && event.which !== 1) {
        return;
      }
      const clientEventCoordinates = getClientEventCoordinates(event);
      this.setState({ moving: true }, () => {
        if (this.shouldNotUpdateReduxWhileMoving()) {
          this.setState({
            offset: new Point(clientEventCoordinates.clientX, clientEventCoordinates.clientY),
            pos: { ...this.props.element.bounds },
          });
        } else {
          this.setState({
            offset: new Point(clientEventCoordinates.clientX, clientEventCoordinates.clientY),
          });
        }
      });

      if (isMobile({ tablet: true })) {
        document.addEventListener('touchmove', this.onPointerMove);
        document.addEventListener('touchend', this.onPointerUp, { once: true });
      } else {
        document.addEventListener('pointermove', this.onPointerMove);
        document.addEventListener('pointerup', this.onPointerUp, { once: true });
        document.addEventListener('pointerleave', this.onPointerLeave);
      }
      setTimeout(() => !this.props.movable && this.onPointerUp(), 0);
    };

    private onPointerLeave = () => {
      if (this.state.moving) {
        this.onPointerUp();
      }
    };

    private onPointerMove = (event: PointerEvent | TouchEvent) => {
      const clientEventCoordinates = getClientEventCoordinates(event);
      const x = clientEventCoordinates.clientX - this.state.offset.x;
      const y = clientEventCoordinates.clientY - this.state.offset.y;

      if (!this.props.moving) {
        if (Math.abs(x) > 5 || Math.abs(y) > 5) {
          this.props.start();
        }
      } else {
        this.move(x, y);
      }
    };

    private onPointerUp = () => {
      if (isMobile({ tablet: true })) {
        document.removeEventListener('touchmove', this.onPointerMove);
      } else {
        document.removeEventListener('pointermove', this.onPointerMove);
      }

      if (!this.props.moving) {
        this.setState({ moving: false });
        return;
      }

      cancelAnimationFrame(this.animationFrame);
      if (this.shouldNotUpdateReduxWhileMoving()) {
        this.props.move({
          ...this.props.element.bounds,
          x: this.state.pos.x - this.props.element.bounds.x,
          y: this.state.pos.y - this.props.element.bounds.y,
        });
      }
      this.setState({ moving: false });

      this.props.end();
    };

    private shouldNotUpdateReduxWhileMoving() {
      const performance = this.props.performance;
      const numberOfElements = this.props.numberOfElements;
      if (!this.state.moving) {
        return false;
      }

      if (this.props.moving) {
        if (performance > 50000) {
          return numberOfElements > 100;
        } else if (performance > 5000) {
          return numberOfElements > 50;
        } else if (performance > 1000) {
          return numberOfElements > 10;
        }
      }
      return true;
    }
  }

  return enhance(Movable);
};
