import React, { Component, RefObject } from 'react';
import { connect } from 'react-redux';
import ConnectContext, { Provider } from './ConnectContext';
import Port from './../../domain/Port';
import { createRelationship } from '../../domain/Relationship/actions';
import { RelationshipKind, RectEdge } from '../../domain/Relationship';
import RelationshipPreview from './RelationshipPreview';

class ConnectLayer extends Component<Props, State> {
  state: State = {
    start: null,
  };

  private onStartConnect = (port: Port) => (event: React.MouseEvent) => {
    document.addEventListener('mouseup', this.cancel, {
      once: true,
      passive: true,
    });

    this.setState({
      start: port,
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
    this.setState({ start: null });
  };

  render() {
    const context: ConnectContext = {
      isDragging: !!this.state.start,
      onStartConnect: this.onStartConnect,
      onEndConnect: this.onEndConnect,
    };
    return (
      <Provider value={context}>
        {this.props.children}
        <RelationshipPreview
          port={this.state.start}
          canvas={this.props.canvas}
        />
      </Provider>
    );
  }
}

interface OwnProps {
  canvas: RefObject<HTMLDivElement>;
}

interface DispatchProps {
  create: typeof createRelationship;
}

type Props = OwnProps & DispatchProps;

interface State {
  start: Port | null;
}

export default connect(
  null,
  { create: createRelationship }
)(ConnectLayer);
