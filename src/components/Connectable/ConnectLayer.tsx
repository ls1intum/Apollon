import React, { Component } from 'react';
import { connect } from 'react-redux';
import ConnectContext, { Provider } from './ConnectContext';
import Port from './../../domain/Port';
import { Point } from './../../domain/geo';
import { createRelationship } from '../../domain/Relationship/actions';
import { RelationshipKind, RectEdge } from '../../domain/Relationship';

class ConnectLayer extends Component<Props, State> {
  state: State = {
    start: null,
    position: null,
  };

  private onStartConnect = (port: Port) => (event: React.MouseEvent) => {
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.cancel, {
      once: true,
      passive: true,
    });

    this.setState({
      start: port,
      position: {
        x: event.nativeEvent.layerX,
        y: event.nativeEvent.layerY,
      },
    });
  };

  private onEndConnect = (port: Port) => (event: React.MouseEvent) => {
    const { start } = this.state;

    if (!start || start === port) return;

    const edge = (location: Port['location']): RectEdge => {
      switch (location) {
        case 'N':
          return 'TOP';
        case 'E':
          return 'RIGHT';
        case 'S':
          return 'BOTTOM';
        case 'W':
          return 'LEFT';
      }
    };
    this.props.create(
      RelationshipKind.AssociationBidirectional,
      {
        entityId: start.element.id,
        multiplicity: null,
        role: null,
        edge: edge(start.location),
        edgeOffset: 0.5,
      },
      {
        entityId: port.element.id,
        multiplicity: null,
        role: null,
        edge: edge(port.location),
        edgeOffset: 0.5,
      }
    );
  };

  private cancel = (event: MouseEvent) => {
    document.removeEventListener('mousemove', this.onMouseMove);
    this.setState({ start: null });
  };

  private calculatePath = (): Point[] => {
    const path: Point[] = [];
    if (this.state.start) {
      const { element, location } = this.state.start;
      switch (location) {
        case 'N':
          path.push({
            x: element.bounds.x + element.bounds.width / 2,
            y: element.bounds.y,
          });
          path.push({
            x: element.bounds.x + element.bounds.width / 2,
            y: element.bounds.y - 20,
          });
          break;
        case 'E':
          path.push({
            x: element.bounds.x + element.bounds.width,
            y: element.bounds.y + element.bounds.height / 2,
          });
          path.push({
            x: element.bounds.x + element.bounds.width + 20,
            y: element.bounds.y + element.bounds.height / 2,
          });
          break;
        case 'S':
          path.push({
            x: element.bounds.x + element.bounds.width / 2,
            y: element.bounds.y + element.bounds.height,
          });
          path.push({
            x: element.bounds.x + element.bounds.width / 2,
            y: element.bounds.y + element.bounds.height + 20,
          });
          break;
        case 'W':
          path.push({
            x: element.bounds.x,
            y: element.bounds.y + element.bounds.height / 2,
          });
          path.push({
            x: element.bounds.x - 20,
            y: element.bounds.y + element.bounds.height / 2,
          });
          break;
      }
    }
    if (this.state.position) {
      path.push(this.state.position);
    }
    return path;
  };

  private onMouseMove = (event: MouseEvent) => {
    this.setState({
      position: {
        x: event.layerX,
        y: event.layerY,
      },
    });
  };

  render() {
    const context: ConnectContext = {
      isDragging: !!this.state.start,
      onStartConnect: this.onStartConnect,
      onEndConnect: this.onEndConnect,
    };
    const points = this.calculatePath()
      .map(p => `${p.x} ${p.y}`)
      .join(', ');
    return (
      <Provider value={context}>
        {this.props.children}
        {this.state.start && (
          <polyline
            points={points}
            fill="none"
            stroke="black"
            strokeWidth="1"
            strokeDasharray="5,5"
          />
        )}
      </Provider>
    );
  }
}

interface DispatchProps {
  create: typeof createRelationship;
}

type Props = DispatchProps;

interface State {
  start: Port | null;
  position: Point | null;
}

export default connect(
  null,
  { create: createRelationship }
)(ConnectLayer);
