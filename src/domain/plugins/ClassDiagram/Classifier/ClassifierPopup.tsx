import React, { SFC } from 'react';
import { connect } from 'react-redux';
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
} from '../../../../components/Popup/Controls';

const ClassifierComponent: SFC<Props> = ({ element, getById, change }) => {
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
          initial={element.name}
          onSave={value => console.log(value)}
        />
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
      </Section>
      <Section>
        {attributes.map(attribute => (
          <TextField
            key={attribute.id}
            initial={attribute.name}
            onSave={value => console.log(value)}
          />
        ))}
      </Section>
      <Section>
        {methods.map(method => (
          <TextField
            key={method.id}
            initial={method.name}
            onSave={value => console.log(value)}
          />
        ))}
      </Section>
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
  change: typeof ElementRepository.change;
}

type Props = OwnProps & StateProps & DispatchProps;

export default connect<StateProps, DispatchProps, OwnProps, ReduxState>(
  state => ({ getById: ElementRepository.getById(state.elements) }),
  { change: ElementRepository.change }
)(ClassifierComponent);
