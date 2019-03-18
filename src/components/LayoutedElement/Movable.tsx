import React, { Component, ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { findDOMNode } from 'react-dom';
import { State as ReduxState } from './../Store';
import Element, { ElementRepository } from './../../domain/Element';
import ElementComponent, { OwnProps } from './ElementComponent';
import { withCanvas, CanvasContext } from './../Canvas';
import { ContainerRepository } from '../../domain/Container';
import Point from '../../domain/geometry/Point';

const moveable = (WrappedComponent: typeof ElementComponent) => {
  class Moveable extends Component<Props, State> {
    state: State = {
      movable: false,
      moving: false,
      offset: new Point(),
    };

    private move = (x: number, y: number) => {
      const { bounds } = this.props.element;
      if (bounds.x === x && bounds.y === y) return;

      this.props.move(null, {
        x: x - this.props.element.bounds.x,
        y: y - this.props.element.bounds.y,
      });
    };

    private checkOwnership = () => {
      const target = this.props.target ? this.props.target.id : null;
      const { id, owner } = this.props.element;
      if (owner === target) return;

      this.props.changeOwner(id, target);
    };

    private onMouseDown = (event: MouseEvent) => {
      if (event.which !== 1) return;
      const target = event.currentTarget as HTMLElement;
      window.setTimeout(() => {
        if (!this.props.element.selected) return;
        const rect = target.getBoundingClientRect();
        const offset = this.props.coordinateSystem.offset();
        offset.x += event.clientX - rect.left;
        offset.y += event.clientY - rect.top;

        const position = this.props.getAbsolutePosition(this.props.element.id);
        offset.x += position.x - this.props.element.bounds.x;
        offset.y += position.y - this.props.element.bounds.y;

        this.setState({ movable: true, offset });
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
      }, 0);
    };

    private onMouseMove = (event: MouseEvent) => {
      if (!this.state.movable) return;
      const x = event.clientX - this.state.offset.x;
      const y = event.clientY - this.state.offset.y;

      if (!this.state.moving) {
        const { bounds } = this.props.element;
        if (Math.abs(bounds.x - x) > 5 || Math.abs(bounds.y - y) > 5) {
          this.setState({ moving: true });
        }
      } else {
        const point = this.props.coordinateSystem.screenToPoint(x, y);
        this.move(point.x, point.y);
      }
    };

    private onMouseUp = () => {
      const { moving } = this.state;
      this.setState({ movable: false, moving: false, offset: new Point() });
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);
      if (moving) this.checkOwnership();
    };

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      const child = node.firstChild as HTMLElement;
      child.addEventListener('mousedown', this.onMouseDown);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      const child = node.firstChild as HTMLElement;
      child.removeEventListener('mousedown', this.onMouseDown);
    }

    render() {
      return <WrappedComponent {...this.props} moving={this.state.moving} />;
    }
  }

  interface StateProps {
    getAbsolutePosition: (id: string) => Point;
    target: Element | undefined;
  }

  interface DispatchProps {
    move: typeof ElementRepository.move;
    changeOwner: typeof ContainerRepository.changeOwner;
  }

  type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

  interface State {
    movable: boolean;
    moving: boolean;
    offset: Point;
  }

  return compose<ComponentClass<OwnProps>>(
    withCanvas,
    connect<StateProps, DispatchProps, OwnProps, ReduxState>(
      state => ({
        getAbsolutePosition: ElementRepository.getAbsolutePosition(
          state.elements
        ),
        target: Object.values(state.elements).find(element => element.hovered),
      }),
      {
        move: ElementRepository.move,
        changeOwner: ContainerRepository.changeOwner,
      }
    )
  )(Moveable);
};

export default moveable;
