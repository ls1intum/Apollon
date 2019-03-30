import React, { Component, RefObject } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ApollonView } from '../../services/editor/editor-types';
import { Relationship } from '../../services/relationship/relationship';
import { RelationshipRepository } from '../../services/relationship/relationship-repository';
import { ApollonMode } from '../../typings';
import { assessable } from '../layouted-element/assessable';
import { editable } from '../layouted-element/editable';
import { ElementComponent, OwnProps as ElementComponentProps } from '../layouted-element/element-component';
import { hoverable } from '../layouted-element/hoverable';
import { interactable } from '../layouted-element/interactable';
import { selectable } from '../layouted-element/selectable';
import { ModelState } from '../store/model-state';
import { reconnectable } from './reconnectable';
import { RelationshipComponent } from './relationship-component';
import { OwnProps as RelationshipComponentProps } from './relationship-component';

class LayoutedRelationshipComponent extends Component<Props> {
  component: typeof RelationshipComponent = this.composeComponent();

  componentDidUpdate(prevProps: Props) {
    if (prevProps.view !== this.props.view) {
      this.component = this.composeComponent();
      this.forceUpdate();
    }
  }

  render() {
    const relationship = this.props.getById(this.props.relationship);
    if (!relationship) return null;
    const ElementChildComponent = this.component;

    return (
      <ElementChildComponent
        element={relationship}
        interactable={this.props.view === ApollonView.Exporting || this.props.view === ApollonView.Highlight}
        hidden={this.props.view === ApollonView.Highlight && relationship.interactive}
      />
    );
  }

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
    } else if (view === ApollonView.Exporting || view === ApollonView.Highlight) {
      decorators = [interactable, hoverable];
    } else {
      decorators = [reconnectable, editable, selectable, hoverable];
    }
    return compose<typeof RelationshipComponent>(...decorators)(RelationshipComponent);
  }
}

type OwnProps = {
  relationship: string;
  container: RefObject<HTMLDivElement>;
};

type StateProps = {
  getById: (id: string) => Relationship | null;
  readonly: boolean;
  view: ApollonView;
  mode: ApollonMode;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(state => ({
  getById: RelationshipRepository.getById(state.elements),
  readonly: state.editor.readonly,
  view: state.editor.view,
  mode: state.editor.mode,
}));

export const LayoutedRelationship = enhance(LayoutedRelationshipComponent);
