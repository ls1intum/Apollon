import React, { Component } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import Element, { ElementRepository } from './../../domain/Element';
import ElementComponent, { OwnProps } from './ElementComponent';

const resizable = (WrappedComponent: typeof ElementComponent) => {
  class Resizable extends Component<Props, State> {
    state: State = {
      resizing: false,
      size: {
        width: this.props.element.bounds.width,
        height: this.props.element.bounds.height,
      },
      offset: { x: 0, y: 0 },
    };

    private resize = (width: number, height: number) => {
      const { size } = this.state;
      if (size.width === width && size.height === height) return;

      const element: Element = {
        ...this.props.element,
        bounds: { ...this.props.element.bounds, width, height },
      };
      this.props.update(element);
      this.setState({ size: { width, height } });
    };

    private onMouseDown = (event: React.MouseEvent) => {
      if (event.nativeEvent.which !== 1) return;
      let x = 0;
      let y = 0;

      let ownerID = this.props.element.owner;
      while (ownerID) {
        const owner = this.props.getById(ownerID);
        x += owner.bounds.x;
        y += owner.bounds.y;
        ownerID = owner.owner;
      }

      this.setState({ resizing: true, offset: { x, y } });
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    };

    private onMouseMove = (event: MouseEvent) => {
      let width =
        event.layerX - this.props.element.bounds.x - this.state.offset.x;
      let height =
        event.layerY - this.props.element.bounds.y - this.state.offset.y;

      width = Math.round(width / 10) * 10;
      height = Math.round(height / 10) * 10;

      this.resize(width, height);
    };

    private onMouseUp = (event: MouseEvent) => {
      this.setState({ resizing: false, offset: { x: 0, y: 0 } });
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);
    };

    render() {
      return (
        <WrappedComponent {...this.props} resizing={this.state.resizing}>
          {this.props.children}
          <rect
            x={this.props.element.bounds.width - 10}
            y={this.props.element.bounds.height - 10}
            width={15}
            height={15}
            style={{ cursor: 'nwse-resize' }}
            fill="none"
            onMouseDown={this.onMouseDown}
          />
        </WrappedComponent>
      );
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
  )(Resizable);
};

interface State {
  resizing: boolean;
  size: { width: number; height: number };
  offset: { x: number; y: number };
}

export default resizable;
