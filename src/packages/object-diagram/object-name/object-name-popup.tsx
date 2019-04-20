import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { Button } from '../../../components/controls/button/button';
import { Divider } from '../../../components/controls/divider/divider';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { Header } from '../../../components/controls/typography/typography';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { notEmpty } from '../../../utils/not-empty';
import { ObjectAttribute } from '../object-member/object-attribute/object-attribute';
import { ObjectMethod } from '../object-member/object-method/object-method';
import { ModelState } from './../../../components/store/model-state';
import { ObjectName } from './object-name';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
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
          <Flex>
            <Textfield value={element.name} onChange={this.rename(element.id)} />
            <Button color="link" tabIndex={-1} onClick={this.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
          <Divider />
        </section>
        <section>
          <Header>{this.props.translate('popup.attributes')}</Header>
          {attributes.map(attribute => (
            <Flex key={attribute.id}>
              <Textfield gutter={true} value={attribute.name} onChange={this.rename(attribute.id)} />
              <Button color="link" tabIndex={-1} onClick={this.delete(attribute.id)}>
                <TrashIcon />
              </Button>
            </Flex>
          ))}
          <Textfield outline={true} value="" onSubmit={this.create(ObjectAttribute)} />
        </section>
        <section>
          <Divider />
          <Header>{this.props.translate('popup.methods')}</Header>
          {methods.map(method => (
            <Flex key={method.id}>
              <Textfield gutter={true} value={method.name} onChange={this.rename(method.id)} />
              <Button color="link" tabIndex={-1} onClick={this.delete(method.id)}>
                <TrashIcon />
              </Button>
            </Flex>
          ))}
          <Textfield outline={true} value="" onSubmit={this.create(ObjectMethod)} />
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
  getById: (id: string) => UMLElement | null;
}

interface DispatchProps {
  create: typeof UMLElementRepository.create;
  rename: typeof UMLElementRepository.rename;
  delete: typeof UMLElementRepository.delete;
}

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({ getById: UMLElementRepository.getById(state.elements) }),
    {
      create: UMLElementRepository.create,
      rename: UMLElementRepository.rename,
      delete: UMLElementRepository.delete,
    },
  ),
);

export const ObjectNamePopup = enhance(ObjectNameComponent);
