import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { ClassElementType } from '..';
import { Switch } from '../../../components/controls/switch/switch';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { Divider } from '../../../components/popup/controls/divider';
import { Header } from '../../../components/popup/controls/header';
import { Section } from '../../../components/popup/controls/section';
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

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({ getById: ElementRepository.getById(state.elements) }),
    {
      create: ElementRepository.create,
      change: ElementRepository.change,
      rename: ElementRepository.rename,
      delete: ElementRepository.delete,
    },
  ),
);

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
          <Switch value={element.type as ClassElementType} onChange={this.toggle} color="primary">
            <Switch.Item value={ClassElementType.AbstractClass}>{this.props.translate('packages.classDiagram.abstract')}</Switch.Item>
            <Switch.Item value={ClassElementType.Interface}>{this.props.translate('packages.classDiagram.interface')}</Switch.Item>
            <Switch.Item value={ClassElementType.Enumeration}>{this.props.translate('packages.classDiagram.enumeration')}</Switch.Item>
          </Switch>
          <Divider />
        </Section>
        <Section>
          <Header>{this.props.translate('popup.attributes')}</Header>
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
            <Header>{this.props.translate('popup.methods')}</Header>
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

  private toggle = (kind: ClassElementType) => {
    const { element, change } = this.props;
    change(element.id, element.type === kind ? ClassElementType.Class : kind);
  };

  private delete = (id: string) => () => {
    this.props.delete(id);
  };
}

export const ClassifierPopup = enhance(ClassifierComponent);
