import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { Point } from '../../utils/geometry/point';
import { ModelState } from '../store/model-state';
import { ElementComponent, OwnProps } from './element-component';

const Handler = styled.rect`
  fill: none;
  cursor: nwse-resize;
`;

export const resizable = (options?: { preventX: boolean; preventY: boolean }) => (
  WrappedComponent: typeof ElementComponent,
): ComponentClass<OwnProps> => {
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
          <Handler x={x - 10} y={y - 10} width={15} height={15} onPointerDown={this.onPointerDown} />
        </WrappedComponent>
      );
    }

    private resize = (width: number, height: number) => {
      width = Math.round(width / 10) * 10;
      height = Math.round(height / 10) * 10;
      if (options && options.preventX) width = 0;
      if (options && options.preventY) height = 0;
      if (width === 0 && height === 0) return;

      this.setState(state => ({ offset: state.offset.add(width, height) }));
      this.props.resize(this.props.id, { width, height });
    };

    private onPointerDown = (event: React.PointerEvent) => {
      if (event.nativeEvent.which && event.nativeEvent.which !== 1) {
        return;
      }

      this.setState({ resizing: true, offset: new Point(event.clientX, event.clientY) });
      document.addEventListener('pointermove', this.onPointerMove);
      document.addEventListener('pointerup', this.onPointerUp, { once: true });
    };

    private onPointerMove = (event: PointerEvent) => {
      const width = event.clientX - this.state.offset.x;
      const height = event.clientY - this.state.offset.y;
      this.resize(width, height);
    };

    private onPointerUp = () => {
      this.setState({ resizing: false, offset: new Point() });
      document.removeEventListener('pointermove', this.onPointerMove);
      this.props.resized(this.props.element.id);
    };
  }

  type StateProps = {};

  type DispatchProps = {
    resize: typeof UMLElementRepository.resize;
    resized: typeof UMLElementRepository.resizeEnd;
  };

  type State = {
    resizing: boolean;
    offset: Point;
  };

  type Props = OwnProps & StateProps & DispatchProps;

  const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
    null,
    { resize: UMLElementRepository.resize, resized: UMLElementRepository.resizeEnd },
  );

  return enhance(Resizable);
};
