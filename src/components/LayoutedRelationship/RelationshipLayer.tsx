import React, { Component } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import { RectEdge, Point } from '../../domain/geo';
import { DiagramType } from '../../services/EditorService';
import { createRelationship } from '../../domain/Relationship/actions';
import Element from '../../domain/Element';
import { RelationshipKind } from '../../domain/Relationship';
import RelationshipDragPreview from './RelationshipDragPreview';

export interface Connector {
  rectEdge: RectEdge;
  center: Point;
  outer: Point;
  element: Element;
}

export interface Context {
  onMouseDown: (connector: Connector) => (event: React.MouseEvent) => void;
  onMouseUp: (connector: Connector) => (event: React.MouseEvent) => void;
}

export const { Consumer, Provider } = React.createContext<Context | null>(null);

class RelationshipProvider extends Component<Props, State> {
  state: State = {
    mousePosition: null,
    startConnector: null,
  };

  onWindowMouseUp = () => {
    window.setTimeout(this.clearStartConnector, 0);
  };

  onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const containerClientRect = e.currentTarget.getBoundingClientRect();
    this.setState({
      mousePosition: {
        x: e.pageX - containerClientRect.left,
        y: e.pageY - containerClientRect.top,
      },
    });
  };

  clearStartConnector = () => {
    this.setState(state => {
      if (state.startConnector === null) {
        // No state update necessary
        return null as any;
      }

      return { startConnector: null };
    });
  };

  private onMouseDown = (connector: Connector) => (event: React.MouseEvent) => {
    event.stopPropagation();

    window.removeEventListener('mouseup', this.onWindowMouseUp);
    window.addEventListener('mouseup', this.onWindowMouseUp, {
      once: true,
      passive: true,
    });

    const containerClientRect = event.currentTarget.parentElement!.getBoundingClientRect();

    let x = connector.center.x;
    let y = connector.center.y;

    // let owner = connector.element.owner;
    // while (owner) {
    //   x += owner.bounds.x;
    //   y += owner.bounds.y;
    //   owner = owner.owner;
    // }

    connector.center.x = x;
    connector.center.y = y;

    this.setState({
      startConnector: connector,
      mousePosition: { x: event.pageX - containerClientRect.left, y: event.pageY - containerClientRect.top },
    });
  };

  private onMouseUp = (connector: Connector) => (event: React.MouseEvent) => {
    const { startConnector } = this.state;
    if (startConnector === null) {
      // Shouldn't happen
      return;
    }

    const { element: sourceEntity, rectEdge: sourceEdge } = startConnector;

    if (
      sourceEntity.id === connector.element.id &&
      sourceEdge === connector.rectEdge
    ) {
      return;
    }

    this.setState({ startConnector: null });

    const action = this.props.createRelationship(
      this.props.diagramType === DiagramType.ClassDiagram
        ? RelationshipKind.AssociationBidirectional
        : RelationshipKind.ActivityControlFlow,
      {
        entityId: sourceEntity.id,
        multiplicity: null,
        role: null,
        edge: sourceEdge,
        edgeOffset: 0.5,
      },
      {
        entityId: connector.element.id,
        multiplicity: null,
        role: null,
        edge: connector.rectEdge,
        edgeOffset: 0.5,
      }
    );
  };

  render() {
    const context = {
      onMouseDown: this.onMouseDown,
      onMouseUp: this.onMouseUp,
    };

    return (
      <Provider value={context}>
        <div onMouseMoveCapture={this.onMouseMove}>
          {this.props.children}

          {this.state.startConnector !== null && (
            <RelationshipDragPreview
              connectorPosition={this.state.startConnector}
              mousePosition={this.state.mousePosition}
            />
          )}
        </div>
      </Provider>
    );
  }
}

interface StateProps {
  diagramType: DiagramType;
}

interface DispatchProps {
  createRelationship: typeof createRelationship;
}

type Props = StateProps & DispatchProps;

interface State {
  mousePosition: Point | null;
  startConnector: Connector | null;
}

const mapStateToProps = (state: ReduxState) => ({
  diagramType: state.editor.diagramType,
});

export default connect(
  mapStateToProps,
  { createRelationship }
)(RelationshipProvider);
