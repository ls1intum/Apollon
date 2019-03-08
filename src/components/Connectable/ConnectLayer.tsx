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
import BidirectionalAssociation from '../../domain/plugins/class/BidirectionalAssociation';

class ConnectLayer extends Component<Props, State> {
  state: State = {
    start: null,
    resolve: () => {},
    reject: () => {},
  };

  private onStartConnect = (port: Port) => (event: React.MouseEvent): Promise<{ source: Port; target: Port }> => {
    document.addEventListener('mouseup', this.cancel, {
      once: true,
      passive: true,
    });

    return new Promise<{ source: Port; target: Port }>((resolve, reject) => {
      this.setState({
        start: port,
        resolve,
        reject,
      });
    });
  };

  private onEndConnect = (port: Port) => (event: React.MouseEvent) => {
    const { start } = this.state;

    if (!start || start === port) return;

    // const relationship = new BidirectionalAssociation(
    //   'Association',
    //   start,
    //   port
    // );
    this.state.resolve({ source: start, target: port });
    // this.props.create(relationship);
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
    this.state.reject();
    this.setState({ start: null, resolve: () => {}, reject: () => {} });
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
  resolve: (value?: { source: Port; target: Port }) => void;
  reject: (reason?: any) => void;
}

export default connect(
  (state: ReduxState): StateProps => ({
    diagramType: state.diagram.type,
  }),
  { create: RelationshipRepository.create }
)(ConnectLayer);
