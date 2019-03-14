import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import Element, { ElementRepository } from './../../domain/Element';
import ElementComponent, { OwnProps } from './ElementComponent';
import { compose } from 'redux';
import { withCanvas, CanvasContext } from '../Canvas';

const resizable = (WrappedComponent: typeof ElementComponent) => {
  class Resizable extends Component<Props, State> {
    state: State = {
      resizing: false,
      offset: { x: 0, y: 0 },
    };

    private resize = (width: number, height: number) => {
      let { bounds } = this.props.element;
      const { resizable } = (this.props.element
        .constructor as typeof Element).features;
      width = Math.max(0, width);
      height = Math.max(0, height);
      if (resizable === 'HEIGHT' || resizable === 'NONE') {
        width = bounds.width;
      }
      if (resizable === 'WIDTH' || resizable === 'NONE') {
        height = bounds.height;
      }
      if (bounds.width === width && bounds.height === height) return;

      this.props.resize(this.props.element.id, {
        width: width - this.props.element.bounds.width,
        height: height - this.props.element.bounds.height,
      });
    };

    private onMouseDown = (event: React.MouseEvent) => {
      if (event.nativeEvent.which !== 1) return;
      const offset = this.props.coordinateSystem.offset();
      offset.x = this.props.element.bounds.x + offset.x;
      offset.y = this.props.element.bounds.y + offset.y;

      let ownerID = this.props.element.owner;
      while (ownerID) {
        const owner = this.props.getById(ownerID);
        offset.x += owner.bounds.x;
        offset.y += owner.bounds.y;
        ownerID = owner.owner;
      }

      this.setState({ resizing: true, offset });
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    };

    private onMouseMove = (event: MouseEvent) => {
      const width = event.clientX - this.state.offset.x;
      const height = event.clientY - this.state.offset.y;
      const { x, y } = this.props.coordinateSystem.screenToPoint(width, height);
      this.resize(x, y);
    };

    private onMouseUp = (event: MouseEvent) => {
      this.setState({ resizing: false, offset: { x: 0, y: 0 } });
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);
    };

    render() {
      return (
        <WrappedComponent {...this.props}>
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
    resize: typeof ElementRepository.resize;
  }

  interface State {
    resizing: boolean;
    offset: { x: number; y: number };
  }

  type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

  return compose<ComponentClass<OwnProps>>(
    withCanvas,
    connect<StateProps, DispatchProps, OwnProps, ReduxState>(
      state => ({
        getById: ElementRepository.getById(state.elements),
      }),
      { resize: ElementRepository.resize }
    )
  )(Resizable);
};

export default resizable;
