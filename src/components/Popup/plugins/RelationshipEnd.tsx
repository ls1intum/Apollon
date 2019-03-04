import React, { SFC } from 'react';
import { connect } from 'react-redux';
import Relationship from './../../../domain/Relationship';
import Element, { ElementRepository } from '../../../domain/Element';
import { State } from '../../Store';

const RelationshipEnd: SFC<Props> = ({
  relationship,
  end,
  elements,
  getById,
  update,
}) => {
  const multiplicity: string = (relationship as any)[`${end}Multiplicity`];
  const role: string = (relationship as any)[`${end}Role`];
  const element = getById(relationship[end].element);
  const targets = elements.filter(e => (e.constructor as any).isConnectable);

  const onChangeSelect = (event: React.FormEvent<HTMLSelectElement>) => {
    update({
      ...relationship,
      [end]: {
        ...relationship[end],
        [event.currentTarget.name]: event.currentTarget.value,
      },
    });
  };

  const onChangeText = (event: React.FormEvent<HTMLInputElement>) => {
    update({
      ...relationship,
      [event.currentTarget.name]: event.currentTarget.value,
    });
  };

  return (
    <table>
      <tbody>
        <tr>
          <td>Entity:</td>
          <td>
            <select
              name="element"
              value={element.id}
              onChange={onChangeSelect}
            >
              {targets.map(target => (
                <option key={target.id} value={target.id}>
                  {target.name}
                </option>
              ))}
            </select>
          </td>
        </tr>
        <tr>
          <td>Edge:</td>
          <td>
            <select
              name="location"
              value={relationship[end].location}
              onChange={onChangeSelect}
            >
              <option value="N">Top</option>
              <option value="W">Left</option>
              <option value="E">Right</option>
              <option value="S">Bottom</option>
            </select>
          </td>
        </tr>
        <tr>
          <td>Multiplicity:</td>
          <td>
            <input
              name={`${end}Multiplicity`}
              value={multiplicity}
              onChange={onChangeText}
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
              onChange={onChangeText}
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

interface StateProps {
  getById: (id: string) => Element;
  elements: Element[];
}

interface DispatchProps {
  update: typeof ElementRepository.update;
}

type Props = OwnProps & StateProps & DispatchProps;

export default connect<StateProps, DispatchProps, OwnProps, State>(
  state => ({
    getById: ElementRepository.getById(state.elements),
    elements: ElementRepository.read(state),
  }),
  { update: ElementRepository.update }
)(RelationshipEnd);
