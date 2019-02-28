import React, { Component } from 'react';
import { CanvasConsumer } from '../Canvas/CanvasContext';
import Relationship from '../../domain/Relationship';

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
              <polyline
                points={path}
                stroke={element.hovered || element.selected ? 'rgba(0, 100, 255, 0.21)' : 'none'}
                fill="none"
                strokeWidth={15}
              />
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
