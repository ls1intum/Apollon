import React, { Component } from 'react';
import Relationship from '../../domain/Relationship';
import { CanvasConsumer } from '../Canvas/CanvasContext';
import * as Plugins from './../../domain/plugins';

class RelationshipComponent extends Component<Props> {
  static defaultProps = {
    disabled: false,
    interactive: false,
    hidden: false,
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
              <polyline
                points={points}
                stroke={!this.props.interactable ? '#0064ff' : element.interactive ? '#00dc00' : 'none'}
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
  interactable: boolean;
}

type Props = OwnProps;

export default RelationshipComponent;
