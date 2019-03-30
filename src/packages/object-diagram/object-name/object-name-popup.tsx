import React, { Component, SFC } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Divider } from '../../../components/popup/controls/divider';
import { Header } from '../../../components/popup/controls/header';
import { Section } from '../../../components/popup/controls/section';
import { TextField } from '../../../components/popup/controls/textfield';
import { TrashCanIcon } from '../../../components/popup/controls/trashcan';
import { Element } from '../../../services/element/element';
import { ElementRepository } from '../../../services/element/element-repository';
import { notEmpty } from '../../../utils/not-empty';
import { ObjectAttribute } from '../object-attribute/object-attribute';
import { ModelState } from './../../../components/store/model-state';
import { ObjectName } from './object-name';

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Trash = styled(TrashCanIcon).attrs({ width: 20 })`
  margin-left: 0.5rem;
`;

const NewMember = styled(TextField)`
  &:not(:focus):not(:hover) {
    background: rgba(255, 255, 255, 0.5);
  }

  &:not(:focus) {
    border-style: dashed;
  }
`;

class ObjectNameComponent extends Component<Props> {

  render() {
    const { element, getById } = this.props;
    const children = element.ownedElements.map(id => getById(id)).filter(notEmpty);
    const attributes = children.filter(child => child instanceof ObjectAttribute);

    return (
      <div>
        <Section>
          <TextField value={element.name} onUpdate={this.rename(element.id)} />
          <Divider />
        </Section>
        <Section>
          <Header>Attributes</Header>
          {attributes.map(attribute => (
            <Flex key={attribute.id}>
              <TextField value={attribute.name} onUpdate={this.rename(attribute.id)} />
              <Trash onClick={this.delete(attribute.id)} />
            </Flex>
          ))}
          <NewMember value="" onCreate={this.create} />
        </Section>
      </div>
    );
  }
  private create = (value: string) => {
    const { element, create } = this.props;
    const member = new ObjectAttribute();
    member.name = value;
    member.owner = element.id;
    create(member);
  };

  private rename = (id: string) => (value: string) => {
    this.props.rename(id, value);
  };

  private delete = (id: string) => () => {
    this.props.delete(id);
  };
}

interface OwnProps {
  element: ObjectName;
}

interface StateProps {
  getById: (id: string) => Element | null;
}

interface DispatchProps {
  create: typeof ElementRepository.create;
  rename: typeof ElementRepository.rename;
  delete: typeof ElementRepository.delete;
}

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  state => ({ getById: ElementRepository.getById(state.elements) }),
  {
    create: ElementRepository.create,
    rename: ElementRepository.rename,
    delete: ElementRepository.delete,
  }
);

export const ObjectNamePopup = enhance(ObjectNameComponent);
