import React, { Component, SFC } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { State as ReduxState } from './../../../../components/Store';
import Element, { ElementRepository } from './../../../Element';
import ObjectName from './ObjectName';
import { ObjectAttribute } from '../ObjectAttribute';
import {
  TextField,
  Section,
  Divider,
  Header,
  Trashcan,
} from '../../../../components/Popup/Controls';
import { notEmpty } from '../../../utils';

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Trash = styled(Trashcan).attrs({ width: 20 })`
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

class ObjectNamePopup extends Component<Props> {
  private create = (value: string) => {
    const { element, create } = this.props;
    const member = new ObjectAttribute({ name: value });
    member.owner = element.id;
    create(member);
  };

  private rename = (id: string) => (value: string) => {
    this.props.rename(id, value);
  };

  private delete = (id: string) => () => {
    this.props.delete(id);
  };

  render() {
    const { element, getById } = this.props;
    const children = element.ownedElements.map(id => getById(id)).filter(notEmpty);
    const attributes = children.filter(
      child => child instanceof ObjectAttribute
    );

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
              <TextField
                value={attribute.name}
                onUpdate={this.rename(attribute.id)}
              />
              <Trash onClick={this.delete(attribute.id)} />
            </Flex>
          ))}
          <NewMember value="" onCreate={this.create} />
        </Section>
      </div>
    );
  }
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

export default connect<StateProps, DispatchProps, OwnProps, ReduxState>(
  state => ({ getById: ElementRepository.getById(state.elements) }),
  {
    create: ElementRepository.create,
    rename: ElementRepository.rename,
    delete: ElementRepository.delete,
  }
)(ObjectNamePopup);
