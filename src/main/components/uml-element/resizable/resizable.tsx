import React, { Component, ComponentType } from 'react';
import { connect, ConnectedComponent } from 'react-redux';
import { ResizeFrom } from '../../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { Point } from '../../../utils/geometry/point';
import { ModelState } from '../../store/model-state';
import { styled } from '../../theme/styles';
import { UMLElementComponentProps } from '../uml-element-component-props';

type StateProps = {
  zoomFactor: number;
  selectionBoxActive: boolean;
};

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

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(
  (state) => ({
    zoomFactor: state.editor.zoomFactor,
    selectionBoxActive: state.editor.selectionBoxActive,
  }),
  {
    start: UMLElementRepository.startResizing,
    resize: UMLElementRepository.resize,
    end: UMLElementRepository.endResizing,
  },
);

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
`;

const HandleTopLeft = styled.rect.attrs({
  x: '0%',
  y: '0%',
  ...Handle,
})`
  cursor: nwse-resize;
`;

const HandleTopRight = styled.rect.attrs({
  x: '100%',
  y: '0%',
  ...Handle,
})`
  cursor: nesw-resize;
`;

const HandleBottomLeft = styled.rect.attrs({
  x: '0%',
  y: '100%',
  ...Handle,
})`
  cursor: nesw-resize;
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
        const { start, resize, end, selectionBoxActive, ...props } = this.props;
        return (
          <WrappedComponent {...props}>
            {props.children}
            <HandleBottomRight
              onPointerDown={(e) => {
                this.onPointerDown(e, ResizeFrom.BOTTOMRIGHT);
              }}
              pointerEvents={selectionBoxActive ? 'none' : 'all'}
            />
            <HandleTopLeft
              onPointerDown={(e) => {
                this.onPointerDown(e, ResizeFrom.TOPLEFT);
              }}
              pointerEvents={selectionBoxActive ? 'none' : 'all'}
            />
            <HandleTopRight
              onPointerDown={(e) => {
                this.onPointerDown(e, ResizeFrom.TOPRIGHT);
              }}
              pointerEvents={selectionBoxActive ? 'none' : 'all'}
            />
            <HandleBottomLeft
              onPointerDown={(e) => {
                this.onPointerDown(e, ResizeFrom.BOTTOMLEFT);
              }}
              pointerEvents={selectionBoxActive ? 'none' : 'all'}
            />
          </WrappedComponent>
        );
      }

      private resize = (width: number, height: number, resizeFrom: ResizeFrom) => {
        width = Math.round(width / 10) * 10;
        height = Math.round(height / 10) * 10;
        if (options && options.preventX) width = 0;
        if (options && options.preventY) height = 0;
        if (width === 0 && height === 0) return;

        this.setState((state) => ({ offset: state.offset.add(width, height) }));
        this.props.resize({ width, height }, resizeFrom, this.props.id);
      };

      private onPointerDown = (event: React.PointerEvent<SVGElement>, resizeFrom: ResizeFrom) => {
        if (event.nativeEvent.which && event.nativeEvent.which !== 1) {
          return;
        }

        let offset = new Point();
        switch (resizeFrom) {
          case ResizeFrom.BOTTOMRIGHT:
            offset = new Point(event.clientX, event.clientY);
            break;
          case ResizeFrom.TOPLEFT:
            offset = new Point(-event.clientX, -event.clientY);
            break;
          case ResizeFrom.TOPRIGHT:
            offset = new Point(event.clientX, -event.clientY);
            break;
          case ResizeFrom.BOTTOMLEFT:
            offset = new Point(-event.clientX, event.clientY);
            break;
        }

        this.setState({ resizing: true, offset: offset.scale(1 / this.props.zoomFactor) });
        this.props.start(this.props.id);
        const element = event.currentTarget;
        element.setPointerCapture(event.pointerId);
        element.addEventListener('pointermove', this.onPointerMove);
        element.setAttribute('resizeFrom', resizeFrom);
        element.addEventListener('pointerup', this.onPointerUp, { once: true });
      };

      private onPointerMove = (event: any) => {
        const resizeFrom = event.currentTarget.getAttribute('resizeFrom');
        let width = 0;
        let height = 0;
        switch (resizeFrom) {
          case ResizeFrom.BOTTOMRIGHT:
            width = event.clientX / this.props.zoomFactor - this.state.offset.x;
            height = event.clientY / this.props.zoomFactor - this.state.offset.y;
            break;
          case ResizeFrom.TOPLEFT:
            width = -event.clientX / this.props.zoomFactor - this.state.offset.x;
            height = -event.clientY / this.props.zoomFactor - this.state.offset.y;
            break;
          case ResizeFrom.TOPRIGHT:
            width = event.clientX / this.props.zoomFactor - this.state.offset.x;
            height = -event.clientY / this.props.zoomFactor - this.state.offset.y;
            break;
          case ResizeFrom.BOTTOMLEFT:
            width = -event.clientX / this.props.zoomFactor - this.state.offset.x;
            height = event.clientY / this.props.zoomFactor - this.state.offset.y;
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
        this.props.end(this.props.id);
        event.stopPropagation();
      };
    }

    return enhance(Resizable);
  };
