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
          const path =
            (context &&
              element.path
                .map(point =>
                  context.coordinateSystem.pointToScreen(point.x, point.y)
                )
                .map(point => `${point.x} ${point.y}`)
                .join(',')) ||
            '';
          return (
            <svg pointerEvents="all">
              <Component element={element} />
              <polyline
                points={path}
                stroke="black"
                fill="none"
                strokeWidth={1}
              />
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
