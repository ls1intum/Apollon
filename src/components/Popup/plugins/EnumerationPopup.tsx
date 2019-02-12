import React, { SFC } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../../../components/Store';
import Element, { ElementRepository } from '../../../domain/Element';
import Method from './../../../domain/plugins/class/Method';
import Attribute from './../../../domain/plugins/class/Attribute';
import { Class } from '../../../domain/plugins';
import NameField from './../NameField';
import { Item, Header, Label, ExistingMember, NewMember } from './../styles';
import Member from '../../../domain/plugins/class/Member';
import { ContainerRepository } from '../../../domain/Container';

const EnumerationPopup: SFC<Props> = ({
  element,
  readAttributes,
  readMethods,
  update,
  addElement,
  removeElement,
}) => {
  const attributes = readAttributes(element.ownedElements);
  const methods = readMethods(element.ownedElements);

  const toggleAbstract = (event: React.ChangeEvent<HTMLInputElement>) =>
    update({ ...element, isAbstract: event.target.checked } as Class);

  const save = (member: Member) => (value: string) =>
    update({ ...member, name: value });

  const create = (Type: typeof Attribute | typeof Method) => (value: string) =>
    addElement(element, new Type(value));

  const remove = (member: Member) => () => {
    removeElement(element, member);
  };

  return (
    <div>
      <Item>
        <Header>Values</Header>
        {attributes.map(a => (
          <ExistingMember key={a.id}>
            <NameField initial={a.name} onSave={save(a)} />
            <a onClick={remove(a)}>X</a>
          </ExistingMember>
        ))}
        <NewMember>
          <NameField initial="" onSave={create(Attribute)} clearOnSave={true} />
        </NewMember>
      </Item>
    </div>
  );
};

interface OwnProps {
  element: Class;
}

interface StateProps {
  readAttributes: (ownedElements: string[]) => Attribute[];
  readMethods: (ownedElements: string[]) => Method[];
}

interface DispatchProps {
  update: typeof ElementRepository.update;
  addElement: typeof ContainerRepository.addElement;
  removeElement: typeof ContainerRepository.removeElement;
}

type Props = OwnProps & StateProps & DispatchProps;

export default connect(
  (state: ReduxState): StateProps => ({
    readAttributes: (ownedElements: string[]) =>
      ownedElements
        .map<Element>(ElementRepository.getById(state.elements))
        .filter(e => e instanceof Attribute),
    readMethods: (ownedElements: string[]) =>
      ownedElements
        .map<Element>(ElementRepository.getById(state.elements))
        .filter(e => e instanceof Method),
  }),
  {
    update: ElementRepository.update,
    addElement: ContainerRepository.addElement,
    removeElement: ContainerRepository.removeElement,
  }
)(EnumerationPopup);
