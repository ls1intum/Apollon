import React, { Component } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import ConnectContext, { ConnectProvider } from './ConnectContext';
import Port from './../../domain/Port';
import Relationship, {
  RelationshipRepository,
  RelationshipKind,
  RectEdge,
} from '../../domain/Relationship';
import RelationshipPreview from './RelationshipPreview';
import { DiagramType } from '../../domain/Diagram';
import { Association } from '../../domain/plugins';

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

    const relationship = new Association('Relationship', start, port);
    this.props.create(relationship)
    // const relationship: Relationship = {
    //   name: 'Relationship',
    //   kind:
    //     this.props.diagramType === DiagramType.ClassDiagram
    //       ? RelationshipKind.AssociationBidirectional
    //       : RelationshipKind.ActivityControlFlow,
    //   source: {
    //     entityId: start.element.id,
    //     multiplicity: null,
    //     role: null,
    //     edge: edge(start.location),
    //     edgeOffset: 0.5,
    //   },
    //   target: {
    //     entityId: port.element.id,
    //     multiplicity: null,
    //     role: null,
    //     edge: edge(port.location),
    //     edgeOffset: 0.5,
    //   },
    //   straightLine: false,
    // };
    // this.props.create(
    //   this.props.diagramType === DiagramType.ClassDiagram
    //     ? RelationshipKind.AssociationBidirectional
    //     : RelationshipKind.ActivityControlFlow,
    //   {
    //     entityId: start.element.id,
    //     multiplicity: null,
    //     role: null,
    //     edge: edge(start.location),
    //     edgeOffset: 0.5,
    //   },
    //   {
    //     entityId: port.element.id,
    //     multiplicity: null,
    //     role: null,
    //     edge: edge(port.location),
    //     edgeOffset: 0.5,
    //   }
    // );
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
      <ConnectProvider value={context}>
        {this.props.children}
        <RelationshipPreview port={this.state.start} />
      </ConnectProvider>
    );
  }
}

interface OwnProps {}

interface StateProps {
  diagramType: DiagramType;
}

interface DispatchProps {
  create: typeof RelationshipRepository.create;
}

type Props = OwnProps & StateProps & DispatchProps;

interface State {
  start: Port | null;
}

export default connect(
  (state: ReduxState): StateProps => ({
    diagramType: state.diagram.type,
  }),
  { create: RelationshipRepository.create }
)(ConnectLayer);
