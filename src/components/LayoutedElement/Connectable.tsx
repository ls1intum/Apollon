import React, { Component } from 'react';
import { connect } from 'react-redux';
import Port from './../../domain/Port';
import { ElementRepository } from './../../domain/Element';
import ElementComponent, { OwnProps } from './ElementComponent';
import { Consumer } from './../Connectable/ConnectContext';

const connectable = (WrappedComponent: typeof ElementComponent) => {
  class Selectable extends Component<Props, State> {
    private calculatePath(port: Port): string {
      const { x, y, width, height } = this.props.element.bounds;
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
          <Consumer
            children={context => {
              return (
                context &&
                (element.selected || context.isDragging) &&
                ports.map(port => (
                  <path
                    key={port.location}
                    d={this.calculatePath(port)}
                    width={10}
                    height={10}
                    fill="rgba(0, 100, 255, 0.21)"
                    onMouseDown={context.onStartConnect(port)}
                    onMouseUp={context.onEndConnect(port)}
                  />
                ))
              );
            }}
          />
        </WrappedComponent>
      );
    }
  }

  interface DispatchProps {
    update: typeof ElementRepository.update;
  }

  type Props = OwnProps & DispatchProps;

  return connect(
    null,
    { update: ElementRepository.update }
  )(Selectable);
};

interface State {}

export default connectable;
