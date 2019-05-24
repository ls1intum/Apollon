import React, { Component, RefObject } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ApollonView } from '../../services/editor/editor-types';
import { UMLRelationship } from '../../services/uml-relationship/uml-relationship';
import { UMLRelationshipRepository } from '../../services/uml-relationship/uml-relationship-repository';
import { ApollonMode } from '../../typings';
import { assessable } from '../layouted-element/assessable';
import { ElementComponent, OwnProps as ElementComponentProps } from '../layouted-element/element-component';
import { hoverable } from '../layouted-element/hoverable';
import { interactable } from '../layouted-element/interactable';
import { selectable } from '../layouted-element/selectable';
import { updatable } from '../layouted-element/updatable';
import { ModelState } from '../store/model-state';
import { reconnectable } from './reconnectable';
import { OwnProps as RelationshipComponentProps, RelationshipComponent } from './relationship-component';

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
        id={this.props.relationship}
        element={relationship}
        interactable={this.props.view === ApollonView.Exporting || this.props.view === ApollonView.Highlight}
        hidden={this.props.view === ApollonView.Highlight && this.props.interactive}
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
      decorators = [assessable, updatable, selectable, hoverable];
    } else if (readonly) {
      decorators = [selectable, hoverable];
    } else if (view === ApollonView.Exporting || view === ApollonView.Highlight) {
      decorators = [interactable, hoverable];
    } else {
      decorators = [reconnectable, updatable, selectable, hoverable];
    }
    return compose<typeof RelationshipComponent>(...decorators)(RelationshipComponent);
  }
}

type OwnProps = {
  relationship: string;
};

type StateProps = {
  getById: (id: string) => UMLRelationship | null;
  readonly: boolean;
  view: ApollonView;
  mode: ApollonMode;
  interactive: boolean;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>((state, props) => ({
  getById: UMLRelationshipRepository.getById(state.elements),
  readonly: state.editor.readonly,
  view: state.editor.view,
  mode: state.editor.mode,
  interactive: state.interactive.includes(props.relationship),
}));

export const LayoutedRelationship = enhance(LayoutedRelationshipComponent);
