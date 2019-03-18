import React, { SFC } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { State as ReduxState } from './../../../../components/Store';
import Classifier from './Classifier';
import { ElementKind } from '..';
import Element, { ElementRepository } from './../../../Element';
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

const ClassifierComponent: SFC<Props> = ({
  element,
  getById,
  create,
  change,
  rename,
  remove,
}) => {
  const toggle = (kind: ElementKind) => () => {
    change(element.id, element.kind === kind ? ElementKind.Class : kind);
  };

  const children = element.ownedElements.map(id => getById(id));
  const attributes = children.filter(child => child instanceof ClassAttribute);
  const methods = children.filter(child => child instanceof ClassMethod);

  return (
    <div>
      <Section>
        <TextField
          value={element.name}
          onChange={value => rename(element.id, value)}
        />
        <Divider />
      </Section>
      <Section>
        <Switch>
          <SwitchItem
            active={element.isAbstract}
            onClick={toggle(ElementKind.AbstractClass)}
          >
            Abstract
          </SwitchItem>
          <SwitchItem
            active={element.isInterface}
            onClick={toggle(ElementKind.Interface)}
          >
            Interface
          </SwitchItem>
          <SwitchItem
            active={element.isEnumeration}
            onClick={toggle(ElementKind.Enumeration)}
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
              onChange={value => rename(attribute.id, value)}
            />
            <Trash onClick={() => remove(attribute.id)} />
          </Flex>
        ))}
        <TextField
          value=""
          onCreate={value => {
            const newElement = new ClassAttribute(value);
            newElement.owner = element.id;
            create(newElement);
          }}
        />
      </Section>
      {!element.isEnumeration && (
        <Section>
          <Divider />
          <Header>Methods</Header>
          {methods.map(method => (
            <Flex key={method.id}>
              <TextField
                value={method.name}
                onChange={value => rename(method.id, value)}
              />
              <Trash onClick={() => remove(method.id)} />
            </Flex>
          ))}
          <TextField
            value=""
            onCreate={value => {
              const newElement = new ClassMethod(value);
              newElement.owner = element.id;
              create(newElement);
            }}
          />
        </Section>
      )}
    </div>
  );
};

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
  remove: typeof ElementRepository.delete;
}

type Props = OwnProps & StateProps & DispatchProps;

export default connect<StateProps, DispatchProps, OwnProps, ReduxState>(
  state => ({ getById: ElementRepository.getById(state.elements) }),
  {
    create: ElementRepository.create,
    change: ElementRepository.change,
    rename: ElementRepository.rename,
    remove: ElementRepository.delete,
  }
)(ClassifierComponent);
