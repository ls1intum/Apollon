import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { DefaultRelationshipType, RelationshipType } from '../../packages/relationship-type';
import { Relationships } from '../../packages/relationships';
import { Port } from '../../services/element/port';
import { RelationshipRepository } from '../../services/relationship/relationship-repository';
import { DiagramType, Direction } from '../../typings';
import { ConnectConsumer, ConnectContext } from '../connectable/connect-context';
import { ModelState } from '../store/model-state';
import { ElementComponent, OwnProps } from './element-component';

const Path = styled.path`
  cursor: crosshair;
`;

const Group = styled.g`
  :hover ${Path} {
    fill-opacity: 0.6;
  }
`;

export const connectable = (WrappedComponent: typeof ElementComponent): ComponentClass<OwnProps> => {
  class Connectable extends Component<Props> {
    render() {
      const { element } = this.props;
      const ports: Port[] = [
        {
          element: element.id,
          direction: Direction.Up,
        },
        {
          element: element.id,
          direction: Direction.Right,
        },
        {
          element: element.id,
          direction: Direction.Down,
        },
        {
          element: element.id,
          direction: Direction.Left,
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
                  key={port.direction}
                  onPointerDown={this.onPointerDown(port, context)}
                  onPointerUp={this.onPointerUp(port, context)}
                  onPointerEnter={this.onPointerEnter}
                  onPointerLeave={this.onPointerLeave}
                  style={{
                    display: element.selected || context.isDragging ? 'block' : 'none',
                  }}
                >
                  {context.isDragging && <path d={this.calculateInvisiblePath(port)} fill="none" />}
                  <Path d={this.calculateVisiblePath(port)} width={10} height={10} fill="#0064ff" fillOpacity="0.2" />
                </Group>
              ))
            }
          />
        </WrappedComponent>
      );
    }
    private calculateInvisiblePath(port: Port): string {
      const { width, height } = this.props.element.bounds;
      const r = 20;
      const cirlce = `m ${-r}, 0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0 `;
      switch (port.direction) {
        case Direction.Up:
          return `M ${width / 2} 0 ${cirlce}`;
        case Direction.Right:
          return `M ${width} ${height / 2} ${cirlce}`;
        case Direction.Down:
          return `M ${width / 2} ${height} ${cirlce}`;
        case Direction.Left:
          return `M 0 ${height / 2} ${cirlce}`;
      }
      return '';
    }

    private calculateVisiblePath(port: Port): string {
      const { width, height } = this.props.element.bounds;
      switch (port.direction) {
        case Direction.Up:
          return `M ${width / 2 - 20} 0 A 10 10 0 0 1 ${width / 2 + 20} 0`;
        case Direction.Right:
          return `M ${width} ${height / 2 - 20} A 10 10 0 0 1 ${width} ${height / 2 + 20}`;
        case Direction.Down:
          return `M ${width / 2 - 20} ${height} A 10 10 0 0 0 ${width / 2 + 20} ${height}`;
        case Direction.Left:
          return `M 0 ${height / 2 - 20} A 10 10 0 0 0 0 ${height / 2 + 20}`;
      }
    }

    private onPointerEnter = (event: React.PointerEvent) => {
      event.currentTarget.classList.add('hover');
    };

    private onPointerLeave = (event: React.PointerEvent) => {
      event.currentTarget.classList.remove('hover');
    };

    private onPointerDown = (port: Port, context: ConnectContext) => async (event: React.PointerEvent) => {
      try {
        const endpoints = await context.onStartConnect(port)(event.nativeEvent);

        const type: RelationshipType = DefaultRelationshipType[this.props.diagramType];
        const RelationshipClazz = Relationships[type];
        const relationship = new RelationshipClazz();
        Object.assign(relationship, {
          type,
          source: { ...endpoints.source },
          target: { ...endpoints.target },
        });
        this.props.create(relationship);
      } catch (error) {}
    };

    private onPointerUp = (port: Port, context: ConnectContext) => async (event: React.PointerEvent) => {
      this.onPointerLeave(event);
      context.onEndConnect(port)(event.nativeEvent);
    };
  }

  interface StateProps {
    diagramType: DiagramType;
  }

  interface DispatchProps {
    create: typeof RelationshipRepository.create;
  }

  type Props = OwnProps & StateProps & DispatchProps;

  return connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({ diagramType: state.diagram.type2 }),
    { create: RelationshipRepository.create },
  )(Connectable);
};
