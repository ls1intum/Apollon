import React, { Component, ComponentClass, ComponentType } from 'react';
import { connect } from 'react-redux';
import { Direction } from '../../../services/uml-element/uml-element-port';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { UMLRelationshipRepository } from '../../../services/uml-relationship/uml-relationship-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { ModelState } from '../../store/model-state';
import { styled } from '../../theme/styles';
import { UMLElementComponentProps } from '../uml-element-component-props';

type StateProps = {
  hovered: boolean;
  selected: boolean;
  connecting: boolean;
  reconnecting: boolean;
};

type DispatchProps = {
  start: AsyncDispatch<typeof UMLElementRepository.startConnecting>;
  connect: AsyncDispatch<typeof UMLElementRepository.connect>;
  reconnect: AsyncDispatch<typeof UMLRelationshipRepository.reconnect>;
};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(
  (state, props) => ({
    hovered: state.hovered[0] === props.id,
    selected: state.selected.includes(props.id),
    connecting: !!state.connecting.length,
    reconnecting: !!Object.keys(state.reconnecting).length,
  }),
  {
    start: UMLElementRepository.startConnecting,
    connect: UMLElementRepository.connect,
    reconnect: UMLRelationshipRepository.reconnect,
  },
);

const Handle = styled(props => (
  <svg {...props}>
    <path d="M -20 0 A 10 10 0 0 1 20 0" />
  </svg>
)).attrs<{ direction: Direction }>(props => {
  const options = {
    ...(props.direction === Direction.Left
      ? { x: 0, rotate: -90 }
      : props.direction === Direction.Right
      ? { x: 100, rotate: 90 }
      : { x: 50, rotate: 0 }),
    ...(props.direction === Direction.Up
      ? { y: 0, rotate: 0 }
      : props.direction === Direction.Down
      ? { y: 100, rotate: 180 }
      : { y: 50 }),
  };

  return {
    fill: '#0064ff',
    fillOpacity: 0.2,
    x: `${options.x}%`,
    y: `${options.y}%`,
    rotate: options.rotate,
  };
})<{ rotate: number }>`
  cursor: crosshair;
  pointer-events: all;

  path {
    transform: rotate(${props => props.rotate}deg);
  }
`;

export const connectable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ComponentClass<UMLElementComponentProps> => {
  class Connectable extends Component<Props> {
    render() {
      const { hovered, selected, connecting, reconnecting, start, connect: _, reconnect, ...props } = this.props;
      return (
        <WrappedComponent {...props}>
          {props.children}
          {(hovered || selected || connecting || reconnecting) && (
            <>
              <Handle direction={Direction.Up} onPointerDown={this.onPointerDown} onPointerUp={this.onPointerUp} />
              <Handle direction={Direction.Right} onPointerDown={this.onPointerDown} onPointerUp={this.onPointerUp} />
              <Handle direction={Direction.Down} onPointerDown={this.onPointerDown} onPointerUp={this.onPointerUp} />
              <Handle direction={Direction.Left} onPointerDown={this.onPointerDown} onPointerUp={this.onPointerUp} />
            </>
          )}
        </WrappedComponent>
      );
    }

    private onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
      const direction = event.currentTarget.getAttribute('direction') as Direction;
      this.props.start(direction);
    };

    private onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
      const direction = event.currentTarget.getAttribute('direction') as Direction;
      if (this.props.connecting) {
        this.props.connect({ element: this.props.id, direction });
      }
      if (this.props.reconnecting) {
        this.props.reconnect({ element: this.props.id, direction });
      }
    };
  }

  return enhance(Connectable);
};
