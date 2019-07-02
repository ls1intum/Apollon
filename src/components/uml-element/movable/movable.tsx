import React, { Component, ComponentClass, ComponentType } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { Point } from '../../../utils/geometry/point';
import { ModelState } from '../../store/model-state';
import { UMLElementComponentProps } from '../uml-element-component';

type StateProps = {
  movable: boolean;
  moving: boolean;
};

type DispatchProps = {
  start: AsyncDispatch<typeof UMLElementRepository.startMoving>;
  move: AsyncDispatch<typeof UMLElementRepository.move>;
  end: AsyncDispatch<typeof UMLElementRepository.endMoving>;
};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

const initialState = {
  offset: new Point(),
};

type State = typeof initialState;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(
  (state, props) => ({
    movable: state.selected.includes(props.id) && !state.resizing.includes(props.id) && !state.connecting.length,
    moving: state.moving.includes(props.id),
  }),
  {
    start: UMLElementRepository.startMoving,
    move: UMLElementRepository.move,
    end: UMLElementRepository.endMoving,
  },
);

export const movable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ComponentClass<UMLElementComponentProps> => {
  class Movable extends Component<Props, State> {
    state = initialState;

    move = (x: number, y: number) => {
      x = Math.round(x / 10) * 10;
      y = Math.round(y / 10) * 10;
      if (x === 0 && y === 0) return;

      this.setState(state => ({ offset: state.offset.add(x, y) }));
      this.props.move({ x, y });
    };

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.style.cursor = 'move';
      const child = node.firstChild as HTMLElement;
      child.addEventListener('pointerdown', this.onPointerDown);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      const child = node.firstChild as HTMLElement;
      child.removeEventListener('pointerdown', this.onPointerDown);
      document.removeEventListener('pointermove', this.onPointerMove);
      document.removeEventListener('pointerup', this.onPointerUp);
    }

    render() {
      const { movable: _, start, move, end, ...props } = this.props;
      return <WrappedComponent {...props} />;
    }

    private onPointerDown = (event: PointerEvent) => {
      if (event.which && event.which !== 1) {
        return;
      }

      this.setState({ offset: new Point(event.clientX, event.clientY) });
      document.addEventListener('pointermove', this.onPointerMove);
      document.addEventListener('pointerup', this.onPointerUp, { once: true });
      setTimeout(() => !this.props.movable && this.onPointerUp(), 0);
    };

    private onPointerMove = (event: PointerEvent) => {
      const x = event.clientX - this.state.offset.x;
      const y = event.clientY - this.state.offset.y;

      if (!this.props.moving) {
        if (Math.abs(x) > 5 || Math.abs(y) > 5) {
          this.props.start();
        }
      } else {
        this.move(x, y);
      }
    };

    private onPointerUp = () => {
      document.removeEventListener('pointermove', this.onPointerMove);
      if (!this.props.moving) {
        return;
      }

      this.setState(initialState);
      this.props.end();
    };
  }

  return enhance(Movable);
};
