import React, { Component } from 'react';
import { CanvasConsumer } from '../Canvas/CanvasContext';
import Relationship from '../../domain/Relationship';
import * as Plugins from './../../domain/plugins';

class RelationshipComponent extends Component<Props> {
  static defaultProps = {
    interactive: false,
    hidden: false,
    selected: false,
    moving: false,
    resizing: false,
    interactable: false,
  };

  render() {
    const { element } = this.props;
    const Component = (Plugins as any)[`${element.kind}Component`];

    return (
      <CanvasConsumer
        children={context => {
          let bounds = element.bounds;
          let path = element.path;
          if (context && element.owner === null) {
            bounds = {
              ...bounds,
              ...context.coordinateSystem.pointToScreen(bounds.x, bounds.y),
            };
            path = path.map(point =>
              context.coordinateSystem.pointToScreen(
                point.x - bounds.x,
                point.y - bounds.y
              )
            );
          }

          const points = path.map(point => `${point.x} ${point.y}`).join(',');

          return (
            <svg
              {...bounds}
              pointerEvents="all"
              style={{
                overflow: 'visible',
                opacity: this.props.hidden ? 0 : 1,
              }}
            >
              <polyline
                points={points}
                stroke={!this.props.interactable ? '#0064ff' : '#00dc00'}
                strokeOpacity={(element.hovered || element.selected || this.props.interactable) ? 0.2 : 0}
                fill="none"
                strokeWidth={15}
              />
              <Component path={path} element={element} />
            </svg>
          );
        }}
      />
    );
  }
}

export interface OwnProps {
  element: Relationship;
  interactive: boolean;
  hidden: boolean;
  moving: boolean;
  resizing: boolean;
  interactable: boolean;
}

type Props = OwnProps;

export default RelationshipComponent;
