import React, { Component, RefObject } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import Relationship, {
  RelationshipRepository,
} from '../../domain/Relationship';
import RelationshipComponent from './RelationshipComponent';
import ElementComponent, {
  OwnProps as ElementComponentProps,
} from './../LayoutedElement/ElementComponent';
import { OwnProps as RelationshipComponentProps } from './RelationshipComponent';
import hoverable from './../LayoutedElement/Hoverable';
import selectable from './../LayoutedElement/Selectable';
import editable from './../LayoutedElement/Editable';
import interactable from './../LayoutedElement/Interactable';
import reconnectable from './Reconnectable';
import Element, { ElementRepository } from '../../domain/Element';
import { EditorMode, ApollonMode } from '../../services/EditorService';

class LayoutedRelationship extends Component<Props> {
  component: typeof RelationshipComponent = this.composeComponent();

  private composeComponent(): typeof RelationshipComponent {
    const { editorMode, apollonMode } = this.props;
    type DecoratorType =
      | ((
          Component: typeof ElementComponent
        ) => React.ComponentClass<ElementComponentProps>)
      | ((
          Component: typeof RelationshipComponent
        ) => React.ComponentClass<RelationshipComponentProps>);
    let decorators: DecoratorType[] = [];

    if (apollonMode === ApollonMode.ReadOnly) {
      decorators = [selectable];
    } else if (editorMode === EditorMode.InteractiveElementsView) {
      decorators = [interactable];
    } else {
      decorators = [reconnectable, editable, selectable, hoverable];
    }
    return compose<typeof RelationshipComponent>(...decorators)(
      RelationshipComponent
    );
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.editorMode !== this.props.editorMode) {
      this.component = this.composeComponent();
      this.forceUpdate();
    }
  }

  render() {
    const relationship = this.props.getById(this.props.relationship);
    if (!Object.keys(relationship).length) return null;
    const Component = this.component;

    return <Component element={relationship} />;
  }
}

interface OwnProps {
  relationship: string;
  container: RefObject<HTMLDivElement>;
}

interface StateProps {
  getElementById: (id: string) => Element;
  getById: (id: string) => Relationship;
  editorMode: EditorMode;
  apollonMode: ApollonMode;
}

type Props = OwnProps & StateProps;

export default connect(
  (state: ReduxState): StateProps => ({
    getElementById: ElementRepository.getById(state.elements),
    getById: RelationshipRepository.getById(state.elements),
    editorMode: state.editor.editorMode,
    apollonMode: state.editor.mode,
  })
)(LayoutedRelationship);
