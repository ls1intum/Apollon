import React, { Component } from 'react';
import { connect } from 'react-redux';
import RelationshipComponent, { OwnProps } from './RelationshipComponent';
import { Point } from '../../domain/geo';
import ConnectContext, { ConnectConsumer } from '../Connectable/ConnectContext';
import { RelationshipRepository } from '../../domain/Relationship';

const reconnectable = (WrappedComponent: typeof RelationshipComponent) => {
  class Reconnectable extends Component<Props, State> {
    state = {
      isReconnecting: false,
    };

    composePath(start: Point, end: Point): Point[] {
      const length = 40;
      if (start.y > end.y) {
        // North
        return [start, { x: start.x, y: start.y - length }];
      }
      if (start.x < end.x) {
        // East
        return [start, { x: start.x + length, y: start.y }];
      }
      if (start.y < end.y) {
        // South
        return [start, { x: start.x, y: start.y + length }];
      }
      if (start.x > end.x) {
        // West
        return [start, { x: start.x - length, y: start.y }];
      }

      return [start, end];
    }

    private start = () => {
      this.setState({ isReconnecting: true });
    }

    private onMouseDown = (
      position: 'source' | 'target',
      context: ConnectContext
    ) => async (event: React.MouseEvent) => {
      document.addEventListener('mousemove', this.start, {
        once: true,
        passive: true,
      });
      const change = position === 'source' ? 'target' : 'source';
      try {
        const endpoints = await context.onStartConnect(
          this.props.element[position]
        )(event);
        this.props.connect(this.props.element.id, {
          [change]: endpoints.target,
        });
      } catch (error) {
      } finally {
        this.setState({ isReconnecting: false });
        document.removeEventListener('mousemove', this.start);
      }
    };

    render() {
      const { path } = this.props;
      const handleStart = this.composePath(path[0], path[1]);
      const handleEnd = this.composePath(
        path[path.length - 1],
        path[path.length - 2]
      );
      return (
        !this.state.isReconnecting && (
          <ConnectConsumer
            children={context =>
              context && (
                <WrappedComponent {...this.props} disabled={context.isDragging}>
                  {this.props.children}
                  <g>
                    <line
                      x1={handleStart[0].x}
                      y1={handleStart[0].y}
                      x2={handleStart[1].x}
                      y2={handleStart[1].y}
                      strokeWidth={15}
                      onMouseDown={this.onMouseDown('target', context)}
                    />
                    <line
                      x1={handleEnd[0].x}
                      y1={handleEnd[0].y}
                      x2={handleEnd[1].x}
                      y2={handleEnd[1].y}
                      strokeWidth={15}
                      onMouseDown={this.onMouseDown('source', context)}
                    />
                  </g>
                </WrappedComponent>
              )
            }
          />
        )
      );
    }
  }

  interface StateProps {}

  interface DispatchProps {
    connect: typeof RelationshipRepository.connect;
  }

  type Props = OwnProps & StateProps & DispatchProps;

  interface State {
    isReconnecting: boolean;
  }

  return connect<StateProps, DispatchProps, OwnProps>(
    null,
    { connect: RelationshipRepository.connect }
  )(Reconnectable);
};

export default reconnectable;
