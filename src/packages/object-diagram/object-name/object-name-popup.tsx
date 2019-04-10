import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { Divider } from '../../../components/controls/divider/divider';
import { Header } from '../../../components/controls/header';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { TrashCanIcon } from '../../../components/controls/trashcan';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { Element } from '../../../services/element/element';
import { ElementRepository } from '../../../services/element/element-repository';
import { notEmpty } from '../../../utils/not-empty';
import { ObjectAttribute } from '../object-member/object-attribute/object-attribute';
import { ObjectMethod } from '../object-member/object-method/object-method';
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

const NewMember = styled(Textfield)`
  &:not(:focus) {
    border-style: dashed;
  }

  &:not(:focus):not(:hover) {
    background: rgba(255, 255, 255, 0.5);
  }
`;

class ObjectNameComponent extends Component<Props> {
  render() {
    const { element, getById } = this.props;
    const children = element.ownedElements.map(id => getById(id)).filter(notEmpty);
    const attributes = children.filter(child => child instanceof ObjectAttribute);
    const methods = children.filter(child => child instanceof ObjectMethod);

    return (
      <div>
        <section>
          <Textfield value={element.name} onChange={this.rename(element.id)} />
          <Divider />
        </section>
        <section>
          <Header>{this.props.translate('popup.attributes')}</Header>
          {attributes.map(attribute => (
            <Flex key={attribute.id}>
              <Textfield value={attribute.name} onChange={this.rename(attribute.id)} />
              <Trash onClick={this.delete(attribute.id)} />
            </Flex>
          ))}
          <NewMember value="" onSubmit={this.create(ObjectAttribute)} />
        </section>
        <section>
          <Divider />
          <Header>{this.props.translate('popup.methods')}</Header>
          {methods.map(method => (
            <Flex key={method.id}>
              <Textfield value={method.name} onChange={this.rename(method.id)} />
              <Trash onClick={this.delete(method.id)} />
            </Flex>
          ))}
          <NewMember value="" onSubmit={this.create(ObjectMethod)} />
        </section>
      </div>
    );
  }
  private create = (Clazz: typeof ObjectAttribute | typeof ObjectMethod) => (value: string) => {
    const { element, create } = this.props;
    const member = new Clazz();
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

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({ getById: ElementRepository.getById(state.elements) }),
    {
      create: ElementRepository.create,
      rename: ElementRepository.rename,
      delete: ElementRepository.delete,
    },
  ),
);

export const ObjectNamePopup = enhance(ObjectNameComponent);
