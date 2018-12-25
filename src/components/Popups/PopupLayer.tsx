import React, { Component, createContext } from 'react';
import { connect } from 'react-redux';
import Element from './../../domain/Element';
import { LayoutedRelationship } from './../../domain/Relationship';
import { State as ReduxState } from './../Store';
import { DiagramType } from '../../services/EditorService';
import EntityDetailsPopup from './EntityDetailsPopup';
import RelationshipDetailsPopup from './RelationshipDetailsPopup';

interface IPopupContext {
  showElement: (element: Element) => void;
  showRelationship: (relationship: LayoutedRelationship) => void;
}

export const PopupContext = createContext<IPopupContext | null>(null);

class PopupLayer extends Component<Props, State> {
  state = {
    element: null,
    relationship: null,
  };

  showElement = (element: Element) => {
    this.setState({ element });
  };

  showRelationship = (relationship: LayoutedRelationship) => {
    this.setState({ relationship });
  };

  render() {
    const { container, diagramType } = this.props;
    const { element, relationship } = this.state;

    let child = <></>;
    if (relationship) {
      child = (
        <RelationshipDetailsPopup
          diagramType={diagramType}
          relationship={relationship}
          onRequestClose={() => {
            this.setState({ relationship: null });
          }}
          canvasScrollContainer={container}
        />
      );
    } else if (element) {
      child = (
        <EntityDetailsPopup
          entity={element}
          onRequestClose={() => {
            this.setState({ element: null });
          }}
          canvasScrollContainer={container}
        />
      );
    }
    const context: IPopupContext = {
      showElement: this.showElement,
      showRelationship: this.showRelationship,
    };
    return (
      <PopupContext.Provider value={context}>
        {this.props.children}
        {child}
      </PopupContext.Provider>
    );
  }
}

interface OwnProps {
  container: HTMLDivElement;
}

interface StateProps {
  diagramType: DiagramType;
}

interface DispatchProps {}

type Props = OwnProps & StateProps & DispatchProps;

interface State {
  element: Element | null;
  relationship: LayoutedRelationship | null;
}

function mapStateToProps(state: ReduxState): StateProps {
  return {
    diagramType: state.editor.diagramType,
  };
}

export default connect<StateProps, DispatchProps, OwnProps, ReduxState>(
  mapStateToProps
)(PopupLayer);
