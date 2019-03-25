import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ModelState } from './../Store';
import { Element, ElementRepository } from './../../domain/Element';
import ElementComponent, { OwnProps } from './ElementComponent';
import { compose } from 'redux';
import { withCanvas, CanvasContext } from '../Canvas';
import Point from '../../domain/geometry/Point';

const Handler = styled.rect`
  width: 15px;
  height: 15px;
  fill: none;
  cursor: nwse-resize;
`;

const resizable = (WrappedComponent: typeof ElementComponent) => {
  class Resizable extends Component<Props, State> {
    state: State = {
      resizing: false,
      offset: new Point(),
    };

    private resize = (width: number, height: number) => {
      const { features } = this.props.element.constructor as typeof Element;
      const { id, bounds } = this.props.element;

      width = Math.max(0, width);
      height = Math.max(0, height);

      if (features.resizable === 'HEIGHT') width = bounds.width;
      if (features.resizable === 'WIDTH') height = bounds.height;
      if (bounds.width === width && bounds.height === height) return;

      this.props.resize(id, {
        width: width - bounds.width,
        height: height - bounds.height,
      });
    };

    private onMouseDown = (event: React.MouseEvent) => {
      if (event.nativeEvent.which !== 1) return;

      const position = this.props.getAbsolutePosition(this.props.element.id);
      const offset = position.add(this.props.coordinateSystem.offset());

      this.setState({ resizing: true, offset });
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    };

    private onMouseMove = (event: MouseEvent) => {
      const width = event.clientX - this.state.offset.x;
      const height = event.clientY - this.state.offset.y;
      const point = this.props.coordinateSystem.screenToPoint(width, height);
      this.resize(point.x, point.y);
    };

    private onMouseUp = () => {
      this.setState({ resizing: false, offset: new Point() });
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);
    };

    render() {
      const { width: x, height: y } = this.props.element.bounds;
      return (
        <WrappedComponent {...this.props}>
          {this.props.children}
          <Handler x={x - 10} y={y - 10} onMouseDown={this.onMouseDown} />
        </WrappedComponent>
      );
    }
  }

  interface StateProps {
    getAbsolutePosition: (id: string) => Point;
  }

  interface DispatchProps {
    resize: typeof ElementRepository.resize;
  }

  interface State {
    resizing: boolean;
    offset: Point;
  }

  type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

  return compose<ComponentClass<OwnProps>>(
    withCanvas,
    connect<StateProps, DispatchProps, OwnProps, ModelState>(
      state => ({
        getAbsolutePosition: ElementRepository.getAbsolutePosition(
          state.elements
        ),
      }),
      { resize: ElementRepository.resize }
    )
  )(Resizable);
};

export default resizable;
