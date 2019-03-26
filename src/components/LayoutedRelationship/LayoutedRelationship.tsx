import React, { Component, RefObject } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { ModelState } from './../Store';
import { Relationship, RelationshipRepository } from '../../services/relationship';
import RelationshipComponent from './RelationshipComponent';
import ElementComponent, { OwnProps as ElementComponentProps } from './../LayoutedElement/ElementComponent';
import { OwnProps as RelationshipComponentProps } from './RelationshipComponent';
import hoverable from './../LayoutedElement/Hoverable';
import selectable from './../LayoutedElement/Selectable';
import editable from './../LayoutedElement/Editable';
import interactable from './../LayoutedElement/Interactable';
import assessable from './../LayoutedElement/Assessable';
import reconnectable from './Reconnectable';
import { ApollonView } from '../../services/editor';
import { ApollonMode } from '../..';

class LayoutedRelationship extends Component<Props> {
  component: typeof RelationshipComponent = this.composeComponent();

  private composeComponent(): typeof RelationshipComponent {
    const { readonly, view, mode } = this.props;
    type DecoratorType =
      | ((Component: typeof ElementComponent) => React.ComponentClass<ElementComponentProps>)
      | ((Component: typeof RelationshipComponent) => React.ComponentClass<RelationshipComponentProps>);
    let decorators: DecoratorType[] = [];

    if (mode === ApollonMode.Assessment) {
      decorators = [assessable, editable, selectable, hoverable];
    } else if (readonly) {
      decorators = [selectable, hoverable];
    } else if (view === ApollonView.Exporting || view == ApollonView.Highlight) {
      decorators = [interactable, hoverable];
    } else {
      decorators = [reconnectable, editable, selectable, hoverable];
    }
    return compose<typeof RelationshipComponent>(...decorators)(RelationshipComponent);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.view !== this.props.view) {
      this.component = this.composeComponent();
      this.forceUpdate();
    }
  }

  render() {
    const relationship = this.props.getById(this.props.relationship);
    if (!Object.keys(relationship).length) return null;
    const Component = this.component;

    return (
      <Component
        element={relationship}
        interactable={this.props.view === ApollonView.Exporting || this.props.view === ApollonView.Highlight}
        hidden={this.props.view === ApollonView.Highlight && relationship.interactive}
      />
    );
  }
}

interface OwnProps {
  relationship: string;
  container: RefObject<HTMLDivElement>;
}

interface StateProps {
  getById: (id: string) => Relationship;
  readonly: boolean;
  view: ApollonView;
  mode: ApollonMode;
}

interface DispatchProps {}

type Props = OwnProps & StateProps & DispatchProps;

export default connect<StateProps, DispatchProps, OwnProps, ModelState>(state => ({
  getById: RelationshipRepository.getById(state.elements),
  readonly: state.editor.readonly,
  view: state.editor.view,
  mode: state.editor.mode,
}))(LayoutedRelationship);
