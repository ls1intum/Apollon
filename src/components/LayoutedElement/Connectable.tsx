import React, { Component, ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import styled from 'styled-components';
import Port from './../../domain/Port';
import { ElementRepository } from './../../domain/Element';
import ElementComponent, { OwnProps } from './ElementComponent';
import { ConnectConsumer } from './../Connectable/ConnectContext';

const Path = styled.path`
  cursor: crosshair;
`;

const Group = styled.g`
  &:hover ${Path}, &.hover ${Path} {
    fill-opacity: 0.6;
  }
`;

const connectable = (WrappedComponent: typeof ElementComponent) => {
  class Selectable extends Component<Props, State> {
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

    render() {
      const { element } = this.props;
      const ports: Port[] = [
        {
          element: element,
          location: 'N',
        },
        {
          element: element,
          location: 'E',
        },
        {
          element: element,
          location: 'S',
        },
        {
          element: element,
          location: 'W',
        },
      ];
      return (
        <WrappedComponent {...this.props}>
          {this.props.children}
          <ConnectConsumer
            children={context =>
              context &&
              (element.selected || context.isDragging) &&
              ports.map(port => (
                <Group
                  key={port.location}
                  onMouseDown={context.onStartConnect(port)}
                  onMouseUp={context.onEndConnect(port)}
                  onMouseEnter={this.onMouseEnter}
                  onMouseLeave={this.onMouseLeave}
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

  interface DispatchProps {
    update: typeof ElementRepository.update;
  }

  type Props = OwnProps & DispatchProps;

  return compose<ComponentClass<OwnProps>>(
    connect(
      null,
      { update: ElementRepository.update }
    )
  )(Selectable);
};

interface State {}

export default connectable;
