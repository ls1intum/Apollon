import React, { Component, ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { findDOMNode } from 'react-dom';
import { State as ReduxState } from './../Store';
import Element, { ElementRepository } from './../../domain/Element';
import ElementComponent, { OwnProps } from './ElementComponent';
import { withCanvas, CanvasContext } from './../Canvas';

const moveable = (WrappedComponent: typeof ElementComponent) => {
  class Moveable extends Component<Props, State> {
    state: State = {
      movable: false,
      moving: false,
      position: {
        x: this.props.element.bounds.x,
        y: this.props.element.bounds.y,
      },
      offset: { x: 0, y: 0 },
    };

    private move = (x: number, y: number) => {
      const { position } = this.state;
      if (position.x === x && position.y === y) return;

      const element: Element = {
        ...this.props.element,
        bounds: { ...this.props.element.bounds, x, y },
      };
      this.props.update(element);
      this.setState({ position: { x, y } });
    };

    private onMouseDown = (event: MouseEvent) => {
      if (event.which !== 1) return;
      const target = event.currentTarget as HTMLElement;
      window.setTimeout(() => {
        if (!this.props.element.selected) return;
        const rect = target!.getBoundingClientRect();
        const offset = this.props.coordinateSystem.offset();
        offset.x = event.clientX - rect.left + offset.x;
        offset.y = event.clientY - rect.top + offset.y;

        let ownerID = this.props.element.owner;
        while (ownerID) {
          const owner = this.props.getById(ownerID);
          offset.x += owner.bounds.x;
          offset.y += owner.bounds.y;
          ownerID = owner.owner;
        }

        this.setState({ movable: true, offset });
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
      }, 0);
    };

    private onMouseMove = (event: MouseEvent) => {
      if (!this.state.movable) return;
      let x = event.clientX - this.state.offset.x;
      let y = event.clientY - this.state.offset.y;

      if (!this.state.moving) {
        const { position } = this.state;
        if (Math.abs(position.x - x) > 5 || Math.abs(position.y - y) > 5) {
          this.setState({ moving: true });
        }
      } else {
        const { x: px, y: py } = this.props.coordinateSystem.screenToPoint(x, y);
        this.move(px, py);
      }
    };

    private onMouseUp = (event: MouseEvent) => {
      this.setState({ movable: false, moving: false, offset: { x: 0, y: 0 } });
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);
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
    getById: (id: string) => Element;
  }

  interface DispatchProps {
    update: typeof ElementRepository.update;
  }

  type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

  interface State {
    movable: boolean;
    moving: boolean;
    position: { x: number; y: number };
    offset: { x: number; y: number };
  }

  return compose<ComponentClass<OwnProps>>(
    withCanvas,
    connect(
      (state: ReduxState): StateProps => ({
        getById: ElementRepository.getById(state.elements),
      }),
      { update: ElementRepository.update }
    )
  )(Moveable);
};

export default moveable;
