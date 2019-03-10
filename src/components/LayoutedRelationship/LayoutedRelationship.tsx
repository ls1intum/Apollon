import React, { Component, RefObject } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import Relationship, {
  RelationshipRepository,
} from '../../domain/Relationship';
import RelationshipComponent from './RelationshipComponent';
import { OwnProps as ComponentProps } from './../LayoutedElement/ElementComponent';
import hoverable from './../LayoutedElement/Hoverable';
import selectable from './../LayoutedElement/Selectable';
import editable from './../LayoutedElement/Editable';
import interactable from './../LayoutedElement/Interactable';
import Element, { ElementRepository } from '../../domain/Element';
import { EditorMode, ApollonMode } from '../../services/EditorService';
import { Rect, RectEdge, Point } from '../../domain/geo';
import { computeRelationshipPath } from '../../rendering/layouters/relationship';

class LayoutedRelationship extends Component<Props> {
  component: typeof RelationshipComponent = this.composeComponent();

  private composeComponent(): typeof RelationshipComponent {
    const { editorMode, apollonMode } = this.props;
    type DecoratorType = (
      Component: typeof RelationshipComponent
    ) => React.ComponentClass<ComponentProps>;
    let decorators: DecoratorType[] = [];

    if (apollonMode === ApollonMode.ReadOnly) {
      decorators = [selectable, hoverable];
    } else if (editorMode === EditorMode.InteractiveElementsView) {
      decorators = [interactable];
    } else {
      decorators = [editable, selectable, hoverable];
    }
    return compose<typeof RelationshipComponent>(...decorators)(
      RelationshipComponent
    );
  }

  private composePath = (relationship: Relationship): Point[] => {
    const source = this.props.getElementById(relationship.source.element);
    if (!Object.keys(source).length) return [];
    const sourceRect: Rect = source.bounds;
    const sourceEdge: RectEdge =
      relationship.source.location === 'N'
        ? 'TOP'
        : relationship.source.location === 'E'
        ? 'RIGHT'
        : relationship.source.location === 'S'
        ? 'BOTTOM'
        : 'LEFT';
    const target = this.props.getElementById(relationship.target.element);
    if (!Object.keys(target).length) return [];
    const targetRect: Rect = target.bounds;
    const targetEdge: RectEdge =
      relationship.target.location === 'N'
        ? 'TOP'
        : relationship.target.location === 'E'
        ? 'RIGHT'
        : relationship.target.location === 'S'
        ? 'BOTTOM'
        : 'LEFT';

    return computeRelationshipPath(
      sourceRect,
      sourceEdge,
      0.5,
      targetRect,
      targetEdge,
      0.5,
      false
    );
  };

  componentDidUpdate(prevProps: Props) {
    if (prevProps.editorMode !== this.props.editorMode) {
      this.component = this.composeComponent();
      this.forceUpdate();
    }
  }

  render() {
    const relationship = this.props.getById(this.props.relationship);
    const path = this.composePath(relationship);
    const Component = this.component;
    return <Component element={relationship} path={path} />;
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
