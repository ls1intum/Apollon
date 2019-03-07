import React, { Component } from 'react';
import { connect } from 'react-redux';
import Relationship from '../../../domain/Relationship';
import { ElementRepository } from '../../../domain/Element';

const kinds: { [kind: string]: string } = {
  Aggregation: 'Aggregation',
  UnidirectionalAssociation: 'Association (unidirectional)',
  BidirectionalAssociation: 'Association (bidirectional)',
  Composition: 'Composition',
  Dependency: 'Dependency',
  Inheritance: 'Inheritance',
  Realization: 'Realization',
};

class AssociationSwitch extends Component<Props> {
  private onChange = (event: React.FormEvent<HTMLSelectElement>) => {
    const { value } = event.currentTarget;
    const relationship = {
      ...this.props.relationship,
      kind: value,
    };
    this.props.update(relationship);
  };

  render() {
    const { relationship } = this.props;
    return (
      <select value={relationship.kind} onChange={this.onChange}>
        {Object.keys(kinds).map(kind => (
          <option key={kind} value={kind}>
            {kinds[kind]}
          </option>
        ))}
      </select>
    );
  }
}

interface OwnProps {
  relationship: Relationship;
}

interface StateProps {}

interface DispatchProps {
  update: typeof ElementRepository.update;
}

type Props = OwnProps & StateProps & DispatchProps;

export default connect<StateProps, DispatchProps, OwnProps>(
  null,
  {
    update: ElementRepository.update,
  }
)(AssociationSwitch);
