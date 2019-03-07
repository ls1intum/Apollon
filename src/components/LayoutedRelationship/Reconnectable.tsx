import React, { Component } from 'react';
import { connect } from 'react-redux';
import { findDOMNode } from 'react-dom';
import ElementComponent from './../LayoutedElement/ElementComponent';
import RelationshipComponent, { OwnProps } from './RelationshipComponent';
import { ElementRepository } from '../../domain/Element';
import { Point } from '../../domain/geo';

const reconnectable = (WrappedComponent: typeof RelationshipComponent) => {
  class Reconnectable extends Component<Props> {
    composePath(start: Point, end: Point): Point[] {
      if (start.y > end.y) {
        // North
        return [start, { x: start.x, y: start.y - 10 }]
      }
      if (start.x < end.x) {
        // East
        return [start, { x: start.x + 10, y: start.y }]
      }
      if (start.y < end.y) {
        // South
        return [start, { x: start.x, y: start.y + 10 }]
      }
      if (start.x > end.x) {
        // West
        return [start, { x: start.x - 10, y: start.y }]
      }

      return [start, end];
    }

    render() {
      const { path } = this.props;
      const handleStart = this.composePath(path[0], path[1])
      console.log('fst', handleStart);
      console.log('sec', this.composePath(path[path.length - 1], path[path.length - 2]));
      return (
        <WrappedComponent {...this.props}>
          {this.props.children}
          <line points={handleStart.map(point => `${point.x} ${point.y}`).join(',')} stroke="blue" />
        </WrappedComponent>
      );
    }
  }

  interface StateProps {}

  interface DispatchProps {}

  type Props = OwnProps & StateProps & DispatchProps;

  return connect<StateProps, DispatchProps, OwnProps>(null)(Reconnectable);
};

export default reconnectable;
