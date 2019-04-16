import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { Element } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';
import { Point } from '../../utils/geometry/point';
import { CanvasContext, withCanvas } from '../canvas/canvas-context';
import { ModelState } from '../store/model-state';
import { ElementComponent, OwnProps } from './element-component';

const Handler = styled.rect`
  fill: none;
  cursor: nwse-resize;
`;

export const resizable = (WrappedComponent: typeof ElementComponent) => {
  class Resizable extends Component<Props, State> {
    state: State = {
      resizing: false,
      offset: new Point(),
    };

    render() {
      const { width: x, height: y } = this.props.element.bounds;
      return (
        <WrappedComponent {...this.props}>
          {this.props.children}
          <Handler x={x - 10} y={y - 10} width={15} height={15} onPointerDown={this.onMouseDown} />
        </WrappedComponent>
      );
    }

    private resize = (width: number, height: number) => {
      const { features } = this.props.element.constructor as typeof Element;
      const { id, bounds } = this.props.element;

      width = Math.max(10, width);
      height = Math.max(10, height);

      if (features.resizable === 'HEIGHT') width = bounds.width;
      if (features.resizable === 'WIDTH') height = bounds.height;
      if (bounds.width === width && bounds.height === height) return;

      this.props.resize(id, { width, height });
    };

    private onMouseDown = (event: React.PointerEvent) => {
      if (event.nativeEvent.which && event.nativeEvent.which !== 1) return;

      const position = this.props.getAbsolutePosition(this.props.element.id);
      const offset = position.add(this.props.coordinateSystem.offset());

      this.setState({ resizing: true, offset });
      document.addEventListener('pointermove', this.onMouseMove);
      document.addEventListener('pointerup', this.onMouseUp);
    };

    private onMouseMove = (event: PointerEvent) => {
      const width = event.clientX - this.state.offset.x;
      const height = event.clientY - this.state.offset.y;
      const point = this.props.coordinateSystem.screenToPoint(width, height);
      this.resize(point.x, point.y);
    };

    private onMouseUp = () => {
      this.setState({ resizing: false, offset: new Point() });
      document.removeEventListener('pointermove', this.onMouseMove);
      document.removeEventListener('pointerup', this.onMouseUp);
      this.props.resized(this.props.element.id);
    };
  }

  interface StateProps {
    getAbsolutePosition: (id: string) => Point;
  }

  interface DispatchProps {
    resize: typeof ElementRepository.resize;
    resized: typeof ElementRepository.resized;
  }

  interface State {
    resizing: boolean;
    offset: Point;
  }

  type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

  const enhance = compose<ComponentClass<OwnProps>>(
    withCanvas,
    connect<StateProps, DispatchProps, OwnProps, ModelState>(
      state => ({
        getAbsolutePosition: ElementRepository.getAbsolutePosition(state.elements),
      }),
      { resize: ElementRepository.resize, resized: ElementRepository.resized },
    ),
  );

  return enhance(Resizable);
};
