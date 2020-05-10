import React, { Component, ComponentClass, ComponentType } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { Direction } from '../../../services/uml-element/uml-element-port';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { UMLRelationshipRepository } from '../../../services/uml-relationship/uml-relationship-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { Point } from '../../../utils/geometry/point';
import { ModelState } from '../../store/model-state';
import { styled } from '../../theme/styles';
import { UMLElementComponentProps } from '../uml-element-component-props';

type StateProps = {
  hovered: boolean;
  selected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  ports: { [key in Direction]: Point };
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
    ports: UMLElementRepository.get(state.elements[props.id])!.ports(),
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
)).attrs<{ direction: Direction; ports: { [key in Direction]: Point } }>(({ direction, ports }) => ({
  fill: '#0064ff',
  fillOpacity: 0.2,
  x: `${ports[direction].x}px`,
  y: `${ports[direction].y}px`,
  rotate:
    direction === Direction.Up ? 0 : direction === Direction.Right ? 90 : direction === Direction.Down ? 180 : -90,
}))<{ rotate: number }>`
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
    componentDidMount(): void {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('pointerup', this.elementOnPointerUp.bind(this));
    }

    componentWillUnmount(): void {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('pointerup', this.elementOnPointerUp);
    }

    render(): React.ReactNode {
      const { hovered, selected, connecting, reconnecting, ports, start, connect: _, reconnect, ...props } = this.props;
      return (
        <WrappedComponent {...props}>
          {props.children}
          {(hovered || selected || connecting || reconnecting) && (
            <>
              <Handle
                ports={ports}
                direction={Direction.Up}
                onPointerDown={this.onPointerDown}
                onPointerUp={this.onPointerUp}
              />
              <Handle
                ports={ports}
                direction={Direction.Right}
                onPointerDown={this.onPointerDown}
                onPointerUp={this.onPointerUp}
              />
              <Handle
                ports={ports}
                direction={Direction.Down}
                onPointerDown={this.onPointerDown}
                onPointerUp={this.onPointerUp}
              />
              <Handle
                ports={ports}
                direction={Direction.Left}
                onPointerDown={this.onPointerDown}
                onPointerUp={this.onPointerUp}
              />
            </>
          )}
        </WrappedComponent>
      );
    }

    private elementOnPointerUp = (event: PointerEvent): void => {
      const node = findDOMNode(this) as HTMLElement;
      // calculate event position relative to object position
      const relEventPosition = {
        x: event.clientX - node.getBoundingClientRect().left,
        y: event.clientY - node.getBoundingClientRect().top,
      };
      // calculate the distances to all handles
      const distances = Object.entries(this.props.ports).map(([key, value]) => ({
        key,
        distance: Math.sqrt(Math.pow(value.x - relEventPosition.x, 2) + Math.pow(value.y - relEventPosition.y, 2)),
      }));
      // use handle with min distance to connect to
      const minDistance = Math.min(...distances.map(value => value.distance));
      const direction = distances.filter(value => minDistance === value.distance)[0].key as Direction;

      if (this.props.connecting) {
        this.props.connect({ element: this.props.id, direction });
      }
      if (this.props.reconnecting) {
        this.props.reconnect({ element: this.props.id, direction });
      }
    };

    private onPointerDown = (event: React.PointerEvent<SVGSVGElement>): void => {
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
