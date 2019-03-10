import React, { Component } from 'react';
import Relationship from '../../domain/Relationship';
import * as Plugins from './../../domain/plugins';
import { Point } from '../../domain/geo';
import Boundary from '../../domain/geo/Boundary';
import { CanvasConsumer } from '../Canvas/CanvasContext';

class RelationshipComponent extends Component<Props> {
  static defaultProps = {
    disabled: false,
    interactive: false,
    hidden: false,
    selected: false,
    moving: false,
    resizing: false,
    interactable: false,
  };

  render() {
    const { element, disabled } = this.props;
    const Component = (Plugins as any)[`${element.kind}Component`];
    const points = element.path.map(point => `${point.x} ${point.y}`).join(',');

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
          }
          return (
            <svg
              {...bounds}
              id={element.id}
              pointerEvents={disabled ? 'none' : 'stroke'}
              style={{
                overflow: 'visible',
                opacity: this.props.hidden ? 0 : 1,
              }}
            >
              <rect
                width={bounds.width}
                height={bounds.height}
                fill="red"
                fillOpacity={0.3}
              />
              <polyline
                points={points}
                stroke={!this.props.interactable ? '#0064ff' : '#00dc00'}
                strokeOpacity={
                  element.hovered || element.selected || this.props.interactable
                    ? 0.2
                    : 0
                }
                fill="none"
                strokeWidth={15}
              />
              <Component path={path} element={element} />
              {this.props.children}
            </svg>
          );
        }}
      />
    );
  }
}

export interface OwnProps {
  element: Relationship;
  disabled: boolean;
  interactive: boolean;
  hidden: boolean;
  moving: boolean;
  resizing: boolean;
  interactable: boolean;
}

type Props = OwnProps;

export default RelationshipComponent;
