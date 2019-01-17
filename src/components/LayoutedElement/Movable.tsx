import React, { Component } from 'react';
import { connect } from 'react-redux';
import { findDOMNode } from 'react-dom';
import { State as ReduxState } from './../Store';
import Element, { ElementRepository } from './../../domain/Element';
import ElementComponent, { OwnProps } from './ElementComponent';

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
        const container = this.props.canvas.current!.parentElement!;
        const bounds = container.getBoundingClientRect();
        const rect = target!.getBoundingClientRect();
        let x = event.clientX - rect.left + bounds.left - container.scrollLeft;
        let y = event.clientY - rect.top + bounds.top - container.scrollTop;

        let ownerID = this.props.element.owner;
        while (ownerID) {
          const owner = this.props.getById(ownerID);
          x += owner.bounds.x;
          y += owner.bounds.y;
          ownerID = owner.owner;
        }

        this.setState({ movable: true, offset: { x, y } });
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
        x = Math.round(x / 10) * 10;
        y = Math.round(y / 10) * 10;
        this.move(x, y);
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

  type Props = OwnProps & StateProps & DispatchProps;

  return connect(
    (state: ReduxState): StateProps => ({
      getById: (id: string) => ElementRepository.getById(state, id),
    }),
    { update: ElementRepository.update }
  )(Moveable);
};

interface State {
  movable: boolean;
  moving: boolean;
  position: { x: number; y: number };
  offset: { x: number; y: number };
}

export default moveable;
