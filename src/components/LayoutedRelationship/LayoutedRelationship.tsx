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
import Element, { ElementRepository } from '../../domain/Element';

class LayoutedRelationship extends Component<Props> {
  component: typeof RelationshipComponent = this.composeComponent();

  private composeComponent(): typeof RelationshipComponent {
    type DecoratorType = (
      Component: typeof RelationshipComponent
    ) => React.ComponentClass<ComponentProps>;
    const decorators: DecoratorType[] = [selectable, hoverable];
    return compose<typeof RelationshipComponent>(...decorators)(
      RelationshipComponent
    );
  }

  render() {
    const relationship = this.props.getById(this.props.relationship);
    // relationship.source.element = this.props.getElementById(
    //   relationship.source.element.id
    // );
    // relationship.target.element = this.props.getElementById(
    //   relationship.target.element.id
    // );
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
}

type Props = OwnProps & StateProps;

export default connect(
  (state: ReduxState): StateProps => ({
    getElementById: ElementRepository.getById(state.elements),
    getById: RelationshipRepository.getById(state.elements),
  })
)(LayoutedRelationship);
