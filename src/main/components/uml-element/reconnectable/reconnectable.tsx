import React, { Component, ComponentType } from 'react';
import { connect, ConnectedComponent } from 'react-redux';
import { IUMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { UMLRelationshipRepository } from '../../../services/uml-relationship/uml-relationship-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { IPath, Path } from '../../../utils/geometry/path';
import { Point } from '../../../utils/geometry/point';
import { ModelState } from '../../store/model-state';
import { styled } from '../../theme/styles';
import { UMLElementComponentProps } from '../uml-element-component-props';
import isMobile from 'is-mobile';
import { convertTouchEndIntoPointerUp, getClientEventCoordinates } from '../../../utils/touch-event';

type StateProps = {
  path: IPath;
  reconnecting: boolean;
  disabled: boolean;
  selectionBoxActive: boolean;
};

type DispatchProps = {
  start: AsyncDispatch<typeof UMLRelationshipRepository.startReconnecting>;
  reconnect: AsyncDispatch<typeof UMLRelationshipRepository.reconnect>;
};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

const initialState = {
  offset: new Point(),
  endpoint: null as 'source' | 'target' | null,
};

type State = typeof initialState;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(
  (state, props) => ({
    path: (state.elements[props.id] as IUMLRelationship).path,
    reconnecting: !!state.reconnecting[props.id],
    disabled: !!Object.keys(state.reconnecting).length || !!Object.keys(state.connecting).length,
    selectionBoxActive: state.editor.selectionBoxActive,
  }),
  {
    start: UMLRelationshipRepository.startReconnecting,
    reconnect: UMLRelationshipRepository.reconnect,
  },
);

const Handle = styled.line.attrs({
  strokeWidth: 15,
  strokeOpacity: 0,
  stroke: 'black',
})`
  cursor: move;
`;

export const reconnectable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ConnectedComponent<ComponentType<Props>, UMLElementComponentProps> => {
  class Reconnectable extends Component<Props, State> {
    state = initialState;

    componentWillUnmount() {
      if (isMobile({ tablet: true })) {
        document.removeEventListener('touchmove', this.onPointerMove);
        document.removeEventListener('touchend', this.onPointerUp);
        document.removeEventListener('pointerup', this.onPointerUp);
      } else {
        document.removeEventListener('pointermove', this.onPointerMove);
        document.removeEventListener('pointerup', this.onPointerUp);
      }
      this.cancel();
    }

    render() {
      const { path, reconnecting, start, reconnect, disabled, selectionBoxActive, ...props } = this.props;
      const sourceHandle: IPath = this.composePath(path);
      const targetHandle: IPath = this.composePath([...path].reverse() as IPath);

      return (
        <WrappedComponent {...props}>
          {props.children}
          <Handle
            x1={sourceHandle[0].x}
            y1={sourceHandle[0].y}
            x2={sourceHandle[1].x}
            y2={sourceHandle[1].y}
            onPointerDown={this.onPointerDown}
            data-endpoint="target"
            pointerEvents={selectionBoxActive || disabled ? 'none' : 'all'}
          />
          <Handle
            x1={targetHandle[0].x}
            y1={targetHandle[0].y}
            x2={targetHandle[1].x}
            y2={targetHandle[1].y}
            onPointerDown={this.onPointerDown}
            data-endpoint="source"
            pointerEvents={selectionBoxActive || disabled ? 'none' : 'all'}
          />
        </WrappedComponent>
      );
    }

    private onPointerDown = (event: React.PointerEvent<SVGElement>) => {
      if (event.nativeEvent.which && event.nativeEvent.which !== 1) {
        return;
      }

      const endpoint = event.currentTarget.dataset.endpoint as 'source' | 'target';
      this.setState({ endpoint, offset: new Point(event.clientX, event.clientY) });
      if (isMobile({ tablet: true })) {
        document.addEventListener('touchmove', this.onPointerMove);
        document.addEventListener('touchend', this.onPointerUp, { once: true });
        document.addEventListener('pointerup', this.onPointerUp, { once: true });
      } else {
        document.addEventListener('pointermove', this.onPointerMove);
        document.addEventListener('pointerup', this.onPointerUp, { once: true });
      }
    };

    private onPointerMove = (event: PointerEvent | TouchEvent) => {
      const clientEventCoordinates = getClientEventCoordinates(event);
      const x = clientEventCoordinates.clientX - this.state.offset.x;
      const y = clientEventCoordinates.clientY - this.state.offset.y;

      const { endpoint } = this.state;
      if (!this.props.reconnecting && endpoint) {
        if (Math.abs(x) > 5 || Math.abs(y) > 5) {
          this.props.start(endpoint);
        }
      }
    };

    private onPointerUp = (event: PointerEvent | TouchEvent) => {
      if (!(event instanceof PointerEvent)) {
        convertTouchEndIntoPointerUp(event);
        return;
      }
      if (isMobile({ tablet: true })) {
        document.removeEventListener('touchmove', this.onPointerMove);
      } else {
        document.removeEventListener('pointermove', this.onPointerMove);
      }
      this.cancel();
    };

    private cancel = () => {
      if (!this.props.reconnecting) {
        return;
      }

      this.setState(initialState);
    };

    private composePath = (path: IPath): IPath => {
      const line = new Path(path);
      const distance = Math.min(line.length / 2, 40);
      return [path[0], line.position(distance)];
    };
  }

  return enhance(Reconnectable);
};
