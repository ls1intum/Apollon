import React, { Component } from 'react';
import { Components } from '../../packages/components';
import { Relationship } from '../../services/relationship/relationship';
import { CanvasConsumer } from '../canvas/canvas-context';

export class RelationshipComponent extends Component<Props> {
  static defaultProps = {
    interactive: false,
    hidden: false,
    selected: false,
    moving: false,
    interactable: false,
    disabled: false,
    childComponent: null,
  };

  render() {
    const { element, disabled } = this.props;

    const ElementComponent = Components[element.type];
    const points = element.path.map(point => `${point.x} ${point.y}`).join(',');

    return (
      <CanvasConsumer
        children={context => {
          let bounds = element.bounds;
          if (context) {
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
                stroke={!this.props.interactable ? '#0064ff' : element.interactive ? '#00dc00' : '#00dc00'}
                strokeOpacity={
                  element.hovered || (!this.props.interactable && element.selected) || (this.props.interactable && element.interactive)
                    ? 0.2
                    : 0
                }
                fill="none"
                strokeWidth={15}
              />
              <ElementComponent element={element} />
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
  interactive: boolean;
  hidden: boolean;
  moving: boolean;
  interactable: boolean;
  disabled: boolean;
  childComponent: React.ComponentClass<any> | null;
}

type Props = OwnProps;
