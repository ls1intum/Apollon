import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import styled from 'styled-components';
import Port from './../../domain/Port';
import { ElementRepository } from './../../domain/Element';
import ElementComponent, { OwnProps } from './ElementComponent';
import ConnectContext, {
  ConnectConsumer,
} from './../Connectable/ConnectContext';
import * as Plugins from './../../domain/plugins';
import { DefaultRelationshipKind } from '../../domain/plugins/RelationshipKind';
import { DiagramType } from '../../domain/Diagram';

const Path = styled.path`
  cursor: crosshair;
`;

const Group = styled.g`
  &:hover ${Path}, &.hover ${Path} {
    fill-opacity: 0.6;
  }
`;

const connectable = (
  WrappedComponent: typeof ElementComponent
): ComponentClass<OwnProps> => {
  class Connectable extends Component<Props> {
    private calculateInvisiblePath(port: Port): string {
      const { width, height } = this.props.element.bounds;
      const r = 20;
      const cirlce = `m ${-r}, 0 a ${r},${r} 0 1,0 ${r *
        2},0 a ${r},${r} 0 1,0 ${-r * 2},0 `;
      switch (port.location) {
        case 'N':
          return `M ${width / 2} 0 ${cirlce}`;
        case 'E':
          return `M ${width} ${height / 2} ${cirlce}`;
        case 'S':
          return `M ${width / 2} ${height} ${cirlce}`;
        case 'W':
          return `M 0 ${height / 2} ${cirlce}`;
      }
      return '';
    }

    private calculateVisiblePath(port: Port): string {
      const { width, height } = this.props.element.bounds;
      switch (port.location) {
        case 'N':
          return `M ${width / 2 - 20} 0 A 10 10 0 0 1 ${width / 2 + 20} 0`;
        case 'E':
          return `M ${width} ${height / 2 -
            20} A 10 10 0 0 1 ${width} ${height / 2 + 20}`;
        case 'S':
          return `M ${width / 2 - 20} ${height} A 10 10 0 0 0 ${width / 2 +
            20} ${height}`;
        case 'W':
          return `M 0 ${height / 2 - 20} A 10 10 0 0 0 0 ${height / 2 + 20}`;
      }
    }

    private onMouseEnter = (event: React.MouseEvent) => {
      event.currentTarget.classList.add('hover');
    };

    private onMouseLeave = (event: React.MouseEvent) => {
      event.currentTarget.classList.remove('hover');
    };

    private onMouseDown = (port: Port, context: ConnectContext) => async (
      event: React.MouseEvent
    ) => {
      try {
        const endpoints = await context.onStartConnect(port)(event);

        const Relationship = (Plugins as any)[
          DefaultRelationshipKind[this.props.diagramType]
        ];
        const relationship = new Relationship(
          'Association',
          endpoints.source,
          endpoints.target
        );
        this.props.create(relationship);
      } catch (error) {}
    };

    private onMouseUp = (port: Port, context: ConnectContext) => async (
      event: React.MouseEvent
    ) => {
      this.onMouseLeave(event);
      context.onEndConnect(port)(event);
    };

    render() {
      const { element } = this.props;
      const ports: Port[] = [
        {
          element: element.id,
          location: 'N',
        },
        {
          element: element.id,
          location: 'E',
        },
        {
          element: element.id,
          location: 'S',
        },
        {
          element: element.id,
          location: 'W',
        },
      ];
      return (
        <WrappedComponent {...this.props}>
          {this.props.children}
          <ConnectConsumer
            children={context =>
              context &&
              ports.map(port => (
                <Group
                  key={port.location}
                  onMouseDown={this.onMouseDown(port, context)}
                  onMouseUp={this.onMouseUp(port, context)}
                  onMouseEnter={this.onMouseEnter}
                  onMouseLeave={this.onMouseLeave}
                  style={{
                    display:
                      element.selected || context.isDragging ? 'block' : 'none',
                  }}
                >
                  {context.isDragging && (
                    <path d={this.calculateInvisiblePath(port)} fill="none" />
                  )}
                  <Path
                    d={this.calculateVisiblePath(port)}
                    width={10}
                    height={10}
                    fill="#0064ff"
                    fillOpacity="0.2"
                  />
                </Group>
              ))
            }
          />
        </WrappedComponent>
      );
    }
  }

  interface StateProps {
    diagramType: DiagramType;
  }

  interface DispatchProps {
    create: typeof ElementRepository.create;
  }

  type Props = OwnProps & StateProps & DispatchProps;

  return connect<StateProps, DispatchProps, OwnProps, ReduxState>(
    state => ({ diagramType: state.diagram.type }),
    { create: ElementRepository.create }
  )(Connectable);
};

export default connectable;
