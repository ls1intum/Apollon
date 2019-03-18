import React, { Component, SFC } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { State as ReduxState } from './../../../../components/Store';
import Element, { ElementRepository } from './../../../Element';
import Classifier from './Classifier';
import { ElementKind } from '..';
import { ClassAttribute } from '../ClassMember/ClassAttribute';
import { ClassMethod } from '../ClassMember/ClassMethod';
import {
  Switch,
  SwitchItem,
  TextField,
  Section,
  Divider,
  Header,
  Trashcan,
} from '../../../../components/Popup/Controls';

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

class ClassifierComponent extends Component<Props> {
  private create = (Clazz: typeof ClassAttribute | typeof ClassMethod) => (
    value: string
  ) => {
    const { element, create } = this.props;
    const member = new Clazz(value);
    member.owner = element.id;
    create(member);
  };

  private rename = (id: string) => (value: string) => {
    this.props.rename(id, value);
  };

  private toggle = (kind: ElementKind) => () => {
    const { element, change } = this.props;
    change(element.id, element.kind === kind ? ElementKind.Class : kind);
  };

  private delete = (id: string) => () => {
    this.props.delete(id);
  };

  render() {
    const { element, getById } = this.props;
    const children = element.ownedElements.map(id => getById(id));
    const attributes = children.filter(
      child => child instanceof ClassAttribute
    );
    const methods = children.filter(child => child instanceof ClassMethod);

    return (
      <div>
        <Section>
          <TextField value={element.name} onUpdate={this.rename(element.id)} />
          <Divider />
        </Section>
        <Section>
          <Switch>
            <SwitchItem
              active={element.isAbstract}
              onClick={this.toggle(ElementKind.AbstractClass)}
            >
              Abstract
            </SwitchItem>
            <SwitchItem
              active={element.isInterface}
              onClick={this.toggle(ElementKind.Interface)}
            >
              Interface
            </SwitchItem>
            <SwitchItem
              active={element.isEnumeration}
              onClick={this.toggle(ElementKind.Enumeration)}
            >
              Enum
            </SwitchItem>
          </Switch>
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
          <NewMember value="" onCreate={this.create(ClassAttribute)} />
        </Section>
        {!element.isEnumeration && (
          <Section>
            <Divider />
            <Header>Methods</Header>
            {methods.map(method => (
              <Flex key={method.id}>
                <TextField
                  value={method.name}
                  onUpdate={this.rename(method.id)}
                />
                <Trash onClick={this.delete(method.id)} />
              </Flex>
            ))}
            <NewMember value="" onCreate={this.create(ClassMethod)} />
          </Section>
        )}
      </div>
    );
  }
}

interface OwnProps {
  element: Classifier;
}

interface StateProps {
  getById: (id: string) => Element;
}

interface DispatchProps {
  create: typeof ElementRepository.create;
  change: typeof ElementRepository.change;
  rename: typeof ElementRepository.rename;
  delete: typeof ElementRepository.delete;
}

type Props = OwnProps & StateProps & DispatchProps;

export default connect<StateProps, DispatchProps, OwnProps, ReduxState>(
  state => ({ getById: ElementRepository.getById(state.elements) }),
  {
    create: ElementRepository.create,
    change: ElementRepository.change,
    rename: ElementRepository.rename,
    delete: ElementRepository.delete,
  }
)(ClassifierComponent);
