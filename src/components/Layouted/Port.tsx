import React, { Component } from 'react';
import Element from '../../domain/Element';
import { Consumer, Connector } from '../LayoutedRelationship/RelationshipLayer';
import { RectEdge } from '../../domain/geo';

const connectorRadius = 20;

class Port extends Component<Props> {
  render() {
    const { x, y, width, height } = this.props.element.bounds;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    let connector: Connector;
    let path: string;
    switch (this.props.rectEdge) {
      case 'TOP':
        connector = {
          rectEdge: 'TOP',
          center: { x: centerX, y },
          outer: { x: centerX, y: y - connectorRadius },
          element: this.props.element,
        };
        path = `M ${width / 2 - 20} 0 A 10 10 0 0 1 ${width / 2 + 20} 0`;
        break;
      case 'RIGHT':
        connector = {
          rectEdge: 'RIGHT',
          center: { x: x + width, y: centerY },
          outer: { x: x + width + connectorRadius, y: centerY },
          element: this.props.element,
        };
        path = `M ${width} ${height / 2 - 20} A 10 10 0 0 1 ${width} ${height /
          2 +
          20}`;
        break;
      case 'BOTTOM':
        connector = {
          rectEdge: 'BOTTOM',
          center: { x: centerX, y: y + height },
          outer: { x: centerX, y: y + height + connectorRadius },
          element: this.props.element,
        };
        path = `M ${width / 2 - 20} ${height} A 10 10 0 0 0 ${width / 2 +
          20} ${height}`;
        break;
      case 'LEFT':
        connector = {
          rectEdge: 'LEFT',
          center: { x, y: centerY },
          outer: { x: x - connectorRadius, y: centerY },
          element: this.props.element,
        };
        path = `M 0 ${height / 2 - 20} A 10 10 0 0 0 0 ${height / 2 + 20}`;
        break;
    }
    return (
      <Consumer
        children={context =>
          context && (
            <path
              d={path}
              fill={this.props.show ? 'blue' : 'none'}
              onMouseDown={context.onMouseDown(connector)}
              onMouseUp={context.onMouseUp(connector)}
            />
          )
        }
      />
    );
  }
}

interface OwnProps {
  element: Element;
  rectEdge: RectEdge;
  show: boolean;
}

type Props = OwnProps;

export default Port;
