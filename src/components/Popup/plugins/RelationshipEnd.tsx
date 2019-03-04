import React, { SFC } from 'react';
import { connect } from 'react-redux';
import Relationship from './../../../domain/Relationship';
import { ElementRepository } from '../../../domain/Element';

const RelationshipEnd: SFC<Props> = ({ relationship, end, update }) => {
  const multiplicity: string = (relationship as any)[`${end}Multiplicity`];
  const role: string = (relationship as any)[`${end}Role`];

  const onChange = (event: React.FormEvent<HTMLInputElement>) => {
    const rel = {
      ...relationship,
      [event.currentTarget.name]: event.currentTarget.value,
    };
    update(rel);
  };

  return (
    <table>
      <tbody>
        <tr>
          <td>Multiplicity:</td>
          <td>
            <input
              name={`${end}Multiplicity`}
              value={multiplicity}
              onChange={onChange}
              placeholder="0..*"
            />
          </td>
        </tr>
        <tr>
          <td>Role:</td>
          <td>
            <input
              name={`${end}Role`}
              value={role}
              onChange={onChange}
              placeholder="children"
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
};

interface OwnProps {
  relationship: Relationship;
  end: 'source' | 'target';
}

interface StateProps {}

interface DispatchProps {
  update: typeof ElementRepository.update;
}

type Props = OwnProps & StateProps & DispatchProps;

export default connect<StateProps, DispatchProps, OwnProps>(
  null,
  { update: ElementRepository.update }
)(RelationshipEnd);
