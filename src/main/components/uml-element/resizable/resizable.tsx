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
  resizeWithReposition: AsyncDispatch<typeof UMLElementRepository.resizeWithReposition>;
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
  resizeWithReposition: UMLElementRepository.resizeWithReposition,
  end: UMLElementRepository.endResizing,
});

const Handle = {
  width: 15,
  height: 15,
  transform: 'translate(-10, -10)',
  fill: 'none',
};

const HandleBottomRight = styled.rect.attrs({
  x: '100%',
  y: '100%',
  ...Handle,
})`
  cursor: nwse-resize;
  pointer-events: all;
`;

const HandleTopLeft = styled.rect.attrs({
  x: '0%',
  y: '0%',
  ...Handle,
})`
  cursor: nwse-resize;
  pointer-events: all;
`;

const HandleTopRight = styled.rect.attrs({
  x: '100%',
  y: '0%',
  ...Handle,
})`
  cursor: nesw-resize;
  pointer-events: all;
`;

const HandleBottomLeft = styled.rect.attrs({
  x: '0%',
  y: '100%',
  ...Handle,
})`
  cursor: nesw-resize;
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
        const { start, resize, resizeWithReposition, end, ...props } = this.props;
        return (
          <WrappedComponent {...props}>
            {props.children}
            <HandleBottomRight onPointerDown={(e) => {this.onPointerDown(e, 'bottomRight');}} />
            <HandleTopLeft onPointerDown={(e) => {this.onPointerDown(e, 'topLeft');}} />
            <HandleTopRight onPointerDown={(e) => {this.onPointerDown(e, 'topRight');}} />
            <HandleBottomLeft onPointerDown={(e) => {this.onPointerDown(e, 'bottomLeft');}} />
          </WrappedComponent>
        );
      }

      private resize = (width: number, height: number, resizeFrom: string) => {
        width = Math.round(width / 20) * 20;
        height = Math.round(height / 20) * 20;
        if (options && options.preventX) width = 0;
        if (options && options.preventY) height = 0;
        if (width === 0 && height === 0) return;

        this.setState((state) => ({ offset: state.offset.add(width, height) }));

        if(resizeFrom === 'bottomRight') {
          this.props.resize({ width, height });
        } else {
          this.props.resizeWithReposition({width, height}, resizeFrom);
        }
        
        
      };

      private onPointerDown = (event: React.PointerEvent<SVGElement>, resizeFrom: string) => {
        if (event.nativeEvent.which && event.nativeEvent.which !== 1) {
          return;
        }

        switch (resizeFrom) {
          case 'bottomRight':
            this.setState({ resizing: true, offset: new Point(event.clientX, event.clientY) });
            break;
          case 'topLeft':
            this.setState({ resizing: true, offset: new Point(-event.clientX, -event.clientY) });
            break;
          case 'topRight':
            this.setState({ resizing: true, offset: new Point(event.clientX, -event.clientY) });
            break;
          case 'bottomLeft':
            this.setState({ resizing: true, offset: new Point(-event.clientX, event.clientY) });
            break;
        }

        this.props.start();
        const element = event.currentTarget;
        element.setPointerCapture(event.pointerId);
        element.addEventListener('pointermove', (e: PointerEvent) => {this.onPointerMove(e, resizeFrom);} );
        element.addEventListener('pointerup', this.onPointerUp, { once: true });
      };

      private onPointerMove = (event: PointerEvent, resizeFrom = 'all') => {
        let width = 0;
        let height = 0;
        switch (resizeFrom) {
          case 'bottomRight':
            width = event.clientX - this.state.offset.x;
            height = event.clientY - this.state.offset.y;
            break;
          case 'topLeft':
            width = -event.clientX - this.state.offset.x;
            height = -event.clientY - this.state.offset.y;
            break;
          case 'topRight':
            width = event.clientX - this.state.offset.x;
            height = -event.clientY - this.state.offset.y;
            break;
          case 'bottomLeft':
            width = -event.clientX - this.state.offset.x;
            height = event.clientY - this.state.offset.y;
            break;
        }
        this.resize(width, height, resizeFrom);
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
