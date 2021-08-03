import React, { Component, ComponentType } from 'react';
import { connect, ConnectedComponent } from 'react-redux';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { Point } from '../../../utils/geometry/point';
import { ModelState } from '../../store/model-state';
import { styled } from '../../theme/styles';
import { UMLElementComponentProps } from '../uml-element-component-props';

type StateProps = {};

type DispatchProps = {
  start: AsyncDispatch<typeof UMLElementRepository.startResizing>;
  resize: AsyncDispatch<typeof UMLElementRepository.resize>;
  end: AsyncDispatch<typeof UMLElementRepository.endResizing>;
};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

const initialState = {
  resizing: false,
  offset: new Point(),
};

type State = typeof initialState;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(null, {
  start: UMLElementRepository.startResizing,
  resize: UMLElementRepository.resize,
  end: UMLElementRepository.endResizing,
});

const Handle = styled.rect.attrs({
  x: '100%',
  y: '100%',
  width: 15,
  height: 15,
  transform: 'translate(-10, -10)',
  fill: 'none',
})`
  cursor: nwse-resize;
  pointer-events: all;
`;

export const resizable =
  (options?: { preventX: boolean; preventY: boolean }) =>
  (
    WrappedComponent: ComponentType<UMLElementComponentProps>,
  ): ConnectedComponent<ComponentType<Props>, UMLElementComponentProps> => {
    class Resizable extends Component<Props, State> {
      state = initialState;

      componentWillUnmount() {
        document.removeEventListener('pointermove', this.onPointerMove);
        document.removeEventListener('pointerup', this.onPointerUp);
      }

      render() {
        const { start, resize, end, ...props } = this.props;
        return (
          <WrappedComponent {...props}>
            {props.children}
            <Handle onPointerDown={this.onPointerDown} />
          </WrappedComponent>
        );
      }

      private resize = (width: number, height: number) => {
        width = Math.round(width / 20) * 20;
        height = Math.round(height / 20) * 20;
        if (options && options.preventX) width = 0;
        if (options && options.preventY) height = 0;
        if (width === 0 && height === 0) return;

        this.setState((state) => ({ offset: state.offset.add(width, height) }));
        this.props.resize({ width, height });
      };

      private onPointerDown = (event: React.PointerEvent<SVGElement>) => {
        if (event.nativeEvent.which && event.nativeEvent.which !== 1) {
          return;
        }

        this.setState({ resizing: true, offset: new Point(event.clientX, event.clientY) });
        this.props.start();
        const element = event.currentTarget;
        element.setPointerCapture(event.pointerId);
        element.addEventListener('pointermove', this.onPointerMove);
        element.addEventListener('pointerup', this.onPointerUp, { once: true });
      };

      private onPointerMove = (event: PointerEvent) => {
        const width = event.clientX - this.state.offset.x;
        const height = event.clientY - this.state.offset.y;
        this.resize(width, height);
        event.stopPropagation();
      };

      private onPointerUp = (event: PointerEvent) => {
        const element = event.currentTarget as HTMLDivElement;
        if (!element) {
          return;
        }

        element.releasePointerCapture(event.pointerId);
        element.removeEventListener('pointermove', this.onPointerMove);
        this.setState(initialState);
        this.props.end();
        event.stopPropagation();
      };
    }

    return enhance(Resizable);
  };
