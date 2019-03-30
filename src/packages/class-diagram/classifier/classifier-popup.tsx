import React, { Component, SFC } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ClassElementType } from '..';
import { Divider } from '../../../components/popup/controls/divider';
import { Header } from '../../../components/popup/controls/header';
import { Section } from '../../../components/popup/controls/section';
import { Switch, SwitchItem } from '../../../components/popup/controls/switch';
import { TextField } from '../../../components/popup/controls/textfield';
import { TrashCanIcon } from '../../../components/popup/controls/trashcan';
import { ModelState } from '../../../components/store/model-state';
import { Element } from '../../../services/element/element';
import { ElementRepository } from '../../../services/element/element-repository';
import { notEmpty } from '../../../utils/not-empty';
import { ClassAttribute } from '../class-member/class-attribute/class-attribute';
import { ClassMethod } from '../class-member/class-method/class-method';
import { Classifier } from './classifier';

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

class ClassifierComponent extends Component<Props> {

  render() {
    const { element, getById } = this.props;
    const children = element.ownedElements.map(id => getById(id)).filter(notEmpty);
    const attributes = children.filter(child => child instanceof ClassAttribute);
    const methods = children.filter(child => child instanceof ClassMethod);

    return (
      <div>
        <Section>
          <TextField value={element.name} onUpdate={this.rename(element.id)} />
          <Divider />
        </Section>
        <Section>
          <Switch>
            <SwitchItem active={element.isAbstract} onClick={this.toggle(ClassElementType.AbstractClass)}>
              Abstract
            </SwitchItem>
            <SwitchItem active={element.isInterface} onClick={this.toggle(ClassElementType.Interface)}>
              Interface
            </SwitchItem>
            <SwitchItem active={element.isEnumeration} onClick={this.toggle(ClassElementType.Enumeration)}>
              Enum
            </SwitchItem>
          </Switch>
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
          <NewMember value="" onCreate={this.create(ClassAttribute)} />
        </Section>
        {!element.isEnumeration && (
          <Section>
            <Divider />
            <Header>Methods</Header>
            {methods.map(method => (
              <Flex key={method.id}>
                <TextField value={method.name} onUpdate={this.rename(method.id)} />
                <Trash onClick={this.delete(method.id)} />
              </Flex>
            ))}
            <NewMember value="" onCreate={this.create(ClassMethod)} />
          </Section>
        )}
      </div>
    );
  }
  private create = (Clazz: typeof ClassAttribute | typeof ClassMethod) => (value: string) => {
    const { element, create } = this.props;
    const member = new Clazz();
    member.name = value;
    member.owner = element.id;
    create(member);
  };

  private rename = (id: string) => (value: string) => {
    this.props.rename(id, value);
  };

  private toggle = (kind: ClassElementType) => () => {
    const { element, change } = this.props;
    change(element.id, element.type === kind ? ClassElementType.Class : kind);
  };

  private delete = (id: string) => () => {
    this.props.delete(id);
  };
}

interface OwnProps {
  element: Classifier;
}

interface StateProps {
  getById: (id: string) => Element | null;
}

interface DispatchProps {
  create: typeof ElementRepository.create;
  change: typeof ElementRepository.change;
  rename: typeof ElementRepository.rename;
  delete: typeof ElementRepository.delete;
}

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  state => ({ getById: ElementRepository.getById(state.elements) }),
  {
    create: ElementRepository.create,
    change: ElementRepository.change,
    rename: ElementRepository.rename,
    delete: ElementRepository.delete,
  }
);

export const ClassifierPopup = enhance(ClassifierComponent);
