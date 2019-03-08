import React, { Component } from 'react';
import Relationship from '../../domain/Relationship';
import * as Plugins from './../../domain/plugins';
import { Point } from '../../domain/geo';
import Boundary from '../../domain/geo/Boundary';

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
    let { path } = this.props;
    const { element, bounds, disabled } = this.props;
    const Component = (Plugins as any)[`${element.kind}Component`];
    const points = path.map(point => `${point.x} ${point.y}`).join(',');

    return (
      <svg
        {...bounds}
        pointerEvents={disabled ? 'none' : 'stroke'}
        style={{
          overflow: 'visible',
          opacity: this.props.hidden ? 0 : 1,
        }}
      >
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
  }
}

export interface OwnProps {
  element: Relationship;
  path: Point[];
  bounds: Boundary;
  disabled: boolean;
  interactive: boolean;
  hidden: boolean;
  moving: boolean;
  resizing: boolean;
  interactable: boolean;
}

type Props = OwnProps;

export default RelationshipComponent;
