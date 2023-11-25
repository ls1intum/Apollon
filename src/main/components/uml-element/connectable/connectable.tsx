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
import { convertTouchEndIntoPointerUp } from '../../../utils/touch-event';
import isMobile from 'is-mobile';
import { getPortsForElement, IUMLElement } from '../../../services/uml-element/uml-element';

type StateProps = {
  hovered: boolean;
  selected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  element: IUMLElement;
  type: UMLElementType | UMLRelationshipType;
};

type DispatchProps = {
  start: AsyncDispatch<typeof UMLElementRepository.startConnecting>;
  connect: AsyncDispatch<typeof UMLElementRepository.connect>;
  reconnect: AsyncDispatch<typeof UMLRelationshipRepository.reconnect>;
};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(
  (state, props) => {
    return {
      hovered: state.hovered[0] === props.id,
      selected: state.selected.includes(props.id),
      connecting: !!state.connecting.length,
      reconnecting: !!Object.keys(state.reconnecting).length,
      element: state.elements[props.id],
      type: state.elements[props.id].type as UMLElementType | UMLRelationshipType,
    };
  },
  {
    start: UMLElementRepository.startConnecting,
    connect: UMLElementRepository.connect,
    reconnect: UMLRelationshipRepository.reconnect,
  },
);

const Handle = styled((props) => {
  const { alternativePortVisualization, ...otherProps } = props;
  // alternative port visualization size
  const alternativePortHeight = 10;
  const alternativePortWidth = 5;
  const alternativePortCircleSize = 30;

  // default port visualization size
  const defaultPortSize = 20;
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
    direction === Direction.Up || direction === Direction.Topright || direction === Direction.Topleft
      ? 0
      : direction === Direction.Right || direction === Direction.Upright || direction === Direction.Downright
        ? 90
        : direction === Direction.Down || direction === Direction.Bottomright || direction === Direction.Bottomleft
          ? 180
          : -90,
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
      node.addEventListener('pointerup', this.elementOnPointerUp.bind(this));
      if (isMobile({ tablet: true })) {
        node.addEventListener('touchend', this.elementOnPointerUp.bind(this));
      }
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('pointerup', this.elementOnPointerUp);
      if (isMobile({ tablet: true })) {
        node.removeEventListener('touchend', this.elementOnPointerUp);
      }
    }

    render() {
      const {
        hovered,
        selected,
        connecting,
        reconnecting,
        start,
        connect: _,
        reconnect,
        type,
        element,
        ...props
      } = this.props;

      const features = { ...UMLElements, ...UMLRelationships }[type].features as UMLElementFeatures &
        UMLRelationshipFeatures;

      const ports = getPortsForElement(element);

      return (
        <WrappedComponent {...props}>
          {props.children}
          {(hovered || selected || connecting || reconnecting) && (
            <>
              {this.props.type !== 'ActivityForkNode' && (
                <Handle
                  ports={ports}
                  direction={Direction.Up}
                  onPointerDown={this.onPointerDown}
                  onPointerUp={this.onPointerUp}
                  alternativePortVisualization={features.alternativePortVisualization}
                />
              )}
              {this.props.type !== 'ActivityForkNodeHorizontal' && (
                <Handle
                  ports={ports}
                  direction={Direction.Right}
                  onPointerDown={this.onPointerDown}
                  onPointerUp={this.onPointerUp}
                  alternativePortVisualization={features.alternativePortVisualization}
                />
              )}
              {this.props.type !== 'ActivityForkNode' && (
                <Handle
                  ports={ports}
                  direction={Direction.Down}
                  onPointerDown={this.onPointerDown}
                  onPointerUp={this.onPointerUp}
                  alternativePortVisualization={features.alternativePortVisualization}
                />
              )}

              {this.props.type !== 'ActivityForkNodeHorizontal' && (
                <Handle
                  ports={ports}
                  direction={Direction.Left}
                  onPointerDown={this.onPointerDown}
                  onPointerUp={this.onPointerUp}
                  alternativePortVisualization={features.alternativePortVisualization}
                />
              )}

              {this.props.type === 'ActivityForkNode' && this.props.element.bounds.height > 120 && (
                <>
                  <Handle
                    ports={ports}
                    direction={Direction.Upright}
                    onPointerDown={this.onPointerDown}
                    onPointerUp={this.onPointerUp}
                    alternativePortVisualization={features.alternativePortVisualization}
                  />
                  <Handle
                    ports={ports}
                    direction={Direction.Upleft}
                    onPointerDown={this.onPointerDown}
                    onPointerUp={this.onPointerUp}
                    alternativePortVisualization={features.alternativePortVisualization}
                  />
                  <Handle
                    ports={ports}
                    direction={Direction.Downright}
                    onPointerDown={this.onPointerDown}
                    onPointerUp={this.onPointerUp}
                    alternativePortVisualization={features.alternativePortVisualization}
                  />
                  <Handle
                    ports={ports}
                    direction={Direction.Downleft}
                    onPointerDown={this.onPointerDown}
                    onPointerUp={this.onPointerUp}
                    alternativePortVisualization={features.alternativePortVisualization}
                  />
                </>
              )}

              {this.props.type === 'ActivityForkNodeHorizontal' && this.props.element.bounds.width > 120 && (
                <>
                  <Handle
                    ports={ports}
                    direction={Direction.Topright}
                    onPointerDown={this.onPointerDown}
                    onPointerUp={this.onPointerUp}
                    alternativePortVisualization={features.alternativePortVisualization}
                  />
                  <Handle
                    ports={ports}
                    direction={Direction.Topleft}
                    onPointerDown={this.onPointerDown}
                    onPointerUp={this.onPointerUp}
                    alternativePortVisualization={features.alternativePortVisualization}
                  />
                  <Handle
                    ports={ports}
                    direction={Direction.Bottomright}
                    onPointerDown={this.onPointerDown}
                    onPointerUp={this.onPointerUp}
                    alternativePortVisualization={features.alternativePortVisualization}
                  />
                  <Handle
                    ports={ports}
                    direction={Direction.Bottomleft}
                    onPointerDown={this.onPointerDown}
                    onPointerUp={this.onPointerUp}
                    alternativePortVisualization={features.alternativePortVisualization}
                  />
                </>
              )}
            </>
          )}
        </WrappedComponent>
      );
    }

    private elementOnPointerUp = (event: PointerEvent | TouchEvent) => {
      const node = findDOMNode(this) as HTMLElement;

      // create pointer up event in order to follow connection logic
      // created pointer up event has the correct target, (touchend triggered on same element as touchstart)
      // -> connection logic for desktop can be applied
      if (!(event instanceof PointerEvent)) {
        convertTouchEndIntoPointerUp(event);
        return;
      }

      let direction;

      // if available, we can get the direction from the event target
      if (
        event.target instanceof SVGElement &&
        event.target.parentElement != null &&
        event.target.parentElement.hasAttribute('direction')
      ) {
        direction = event.target.parentElement.getAttribute('direction') as Direction;
      }

      // otherwise get the direction the old way
      if (direction == null) {
        // calculate event position relative to object position in %
        const nodeRect = node.getBoundingClientRect();

        const relEventPosition = {
          x: (event.clientX - nodeRect.left) / nodeRect.width,
          y: (event.clientY - nodeRect.top) / nodeRect.height,
        };

        // relative port locations in %
        const relativePortLocation: { [key in Direction]: Point } = {
          [Direction.Up]: new Point(0.5, 0),
          [Direction.Right]: new Point(1, 0.5),
          [Direction.Down]: new Point(0.5, 1),
          [Direction.Left]: new Point(0, 0.5),
          [Direction.Upright]: new Point(1, 0.25),
          [Direction.Downright]: new Point(1, 0.75),
          [Direction.Upleft]: new Point(0, 0.25),
          [Direction.Downleft]: new Point(0, 0.75),
          [Direction.Topright]: new Point(0.75, 0),
          [Direction.Bottomright]: new Point(0.75, 1),
          [Direction.Topleft]: new Point(0.25, 0),
          [Direction.Bottomleft]: new Point(0.25, 1),
        };

        const ports = getPortsForElement(this.props.element);

        // calculate the distances to all handles
        const distances = Object.entries(ports).map(([key, value]) => ({
          key,
          distance: Math.sqrt(
            Math.pow(relativePortLocation[key as Direction].x - relEventPosition.x, 2) +
              Math.pow(relativePortLocation[key as Direction].y - relEventPosition.y, 2),
          ),
        }));

        // use handle with min distance to connect to
        const minDistance = Math.min(...distances.map((value) => value.distance));
        direction = distances.filter((value) => minDistance === value.distance)[0].key as Direction;
      }

      if (this.props.connecting) {
        this.props.connect({ element: this.props.id, direction });
      }
      if (this.props.reconnecting && !event.defaultPrevented) {
        this.props.reconnect({ element: this.props.id, direction });
        event.preventDefault();
      }
    };

    private onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
      const direction = event.currentTarget.getAttribute('direction') as Direction;
      const id = event.currentTarget.parentElement!.getAttribute('id') as string;
      this.props.start(direction, id);
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
