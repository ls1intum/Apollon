import React, { Component, ComponentType } from 'react';
import { findDOMNode } from 'react-dom';
import { connect, ConnectedComponent } from 'react-redux';
import { Direction } from '../../../services/uml-element/uml-element-port';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { UMLRelationshipRepository } from '../../../services/uml-relationship/uml-relationship-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { Point } from '../../../utils/geometry/point';
import { ModelState } from '../../store/model-state';
import { styled } from '../../theme/styles';
import { UMLElementComponentProps } from '../uml-element-component-props';
import { UMLElements } from '../../../packages/uml-elements';
import { UMLRelationships } from '../../../packages/uml-relationships';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { UMLRelationshipFeatures } from '../../../services/uml-relationship/uml-relationship-features';
import { UMLElementType, UMLRelationshipType } from '../../..';
import { disableScroll, enableScroll } from '../../../services/scrolling/scrolling-repository';

type StateProps = {
  hovered: boolean;
  selected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  ports: { [key in Direction]: Point };
  type: UMLElementType | UMLRelationshipType;
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
    type: state.elements[props.id].type as UMLElementType | UMLRelationshipType,
  }),
  {
    start: UMLElementRepository.startConnecting,
    connect: UMLElementRepository.connect,
    reconnect: UMLRelationshipRepository.reconnect,
  },
);

// alternative port visualization size
const alternativePortHeight = 10;
const alternativePortWidth = 5;
const alternativePortCircleSize = 30;

// default port visualization size
const defaultPortSize = 20;

const Handle = styled((props) => {
  const { alternativePortVisualization, ...otherProps } = props;
  if (alternativePortVisualization) {
    return (
      <svg {...otherProps}>
        <path
          d={`M ${
            alternativePortWidth / 2
          } 0 v -${alternativePortHeight} h -${alternativePortWidth} v ${alternativePortHeight} Z`}
        />
        <path
          d={
            `M -${alternativePortCircleSize / 2} -${alternativePortHeight + alternativePortCircleSize / 2}` +
            ` a ${alternativePortCircleSize / 2} ${
              alternativePortCircleSize / 2
            } 0 0 1 ${alternativePortCircleSize} 0` +
            ` a ${alternativePortCircleSize / 2} ${alternativePortCircleSize / 2} 0 0 1 -${alternativePortCircleSize} 0`
          }
        />
      </svg>
    );
  } else {
    return (
      <svg {...otherProps}>
        <path
          d={`M -${defaultPortSize} 0 A ${defaultPortSize / 2} ${defaultPortSize / 2} 0 0 1 ${defaultPortSize} 0`}
        />
      </svg>
    );
  }
}).attrs<{ direction: Direction; ports: { [key in Direction]: Point } }>(({ direction, ports }) => ({
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
    transform: rotate(${(props) => props.rotate}deg);
  }
`;

export const connectable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ConnectedComponent<ComponentType<Props>, UMLElementComponentProps> => {
  class Connectable extends Component<Props> {
    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      // node.addEventListener('pointerup', this.elementOnPointerUp.bind(this));
      node.addEventListener('touchend', this.elementOnPointerUp.bind(this));
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      // node.removeEventListener('pointerup', this.elementOnPointerUp);
      node.removeEventListener('touchend', this.elementOnPointerUp);
    }

    render() {
      const {
        hovered,
        selected,
        connecting,
        reconnecting,
        ports,
        start,
        connect: _,
        reconnect,
        type,
        ...props
      } = this.props;

      const features = { ...UMLElements, ...UMLRelationships }[type].features as UMLElementFeatures &
        UMLRelationshipFeatures;

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
                alternativePortVisualization={features.alternativePortVisualization}
              />
              <Handle
                ports={ports}
                direction={Direction.Right}
                onPointerDown={this.onPointerDown}
                onPointerUp={this.onPointerUp}
                alternativePortVisualization={features.alternativePortVisualization}
              />
              <Handle
                ports={ports}
                direction={Direction.Down}
                onPointerDown={this.onPointerDown}
                onPointerUp={this.onPointerUp}
                alternativePortVisualization={features.alternativePortVisualization}
              />
              <Handle
                ports={ports}
                direction={Direction.Left}
                onPointerDown={this.onPointerDown}
                onPointerUp={this.onPointerUp}
                alternativePortVisualization={features.alternativePortVisualization}
              />
            </>
          )}
        </WrappedComponent>
      );
    }

    private elementOnPointerUp = (event: PointerEvent | TouchEvent) => {
      const node = findDOMNode(this) as HTMLElement;
      console.log('test');
      console.log(event);

      // create own touch events in order to follow connection logic
      // own touch event has the element at the end of touch as target, not the start element
      // -> connection logic for desktop can be applied
      if (event instanceof TouchEvent && event.changedTouches.length > 0) {
        enableScroll();
        console.log('create own touch event');
        const target = document.elementFromPoint(
          event.changedTouches[event.changedTouches.length - 1].pageX,
          event.changedTouches[event.changedTouches.length - 1].pageY,
        );

        if (!target) {
          return;
        }

        // copy the last touch that happened
        // only replace target and add identifier (must have)
        const touch = new Touch({
          ...event.changedTouches[event.changedTouches.length - 1],
          identifier: 999,
          target: target,
        });
        console.log(event.changedTouches[event.changedTouches.length - 1]);
        console.log(touch);

        // creating touchend event
        const touchEvent = new TouchEvent('touchend', {
          touches: [touch],
          view: window,
          cancelable: true,
          bubbles: true,
        });

        // dispatching on target
        // when it bubbles up -> it reaches the connectable HOC of the target (that we actually want)
        target.dispatchEvent(touchEvent);
        return;
      }

      console.log('connect');

      // calculate event position relative to object position in %
      const nodeRect = node.getBoundingClientRect();

      // touch events are our own created touch events, see above
      const eventClientX = event instanceof PointerEvent ? event.clientX : event.touches[0].clientX;
      const eventClientY = event instanceof PointerEvent ? event.clientY : event.touches[0].clientY;

      const relEventPosition = {
        x: (eventClientX - nodeRect.left) / nodeRect.width,
        y: (eventClientY - nodeRect.top) / nodeRect.height,
      };

      // relative port locations in %
      const relativePortLocation: { [key in Direction]: Point } = {
        [Direction.Up]: new Point(0.5, 0),
        [Direction.Right]: new Point(1, 0.5),
        [Direction.Down]: new Point(0.5, 1),
        [Direction.Left]: new Point(0, 0.5),
      };

      // calculate the distances to all handles
      const distances = Object.entries(this.props.ports).map(([key, value]) => ({
        key,
        distance: Math.sqrt(
          Math.pow(relativePortLocation[key as Direction].x - relEventPosition.x, 2) +
            Math.pow(relativePortLocation[key as Direction].y - relEventPosition.y, 2),
        ),
      }));
      // use handle with min distance to connect to
      const minDistance = Math.min(...distances.map((value) => value.distance));
      const direction = distances.filter((value) => minDistance === value.distance)[0].key as Direction;

      if (this.props.connecting) {
        this.props.connect({ element: this.props.id, direction });
      }
      if (this.props.reconnecting) {
        this.props.reconnect({ element: this.props.id, direction });
      }
    };

    private onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
      const direction = event.currentTarget.getAttribute('direction') as Direction;
      this.props.start(direction);
      disableScroll();
    };

    private onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
      const direction = event.currentTarget.getAttribute('direction') as Direction;
      if (this.props.connecting) {
        this.props.connect({ element: this.props.id, direction });
      }
      if (this.props.reconnecting) {
        this.props.reconnect({ element: this.props.id, direction });
      }
      enableScroll();
    };
  }

  return enhance(Connectable);
};
