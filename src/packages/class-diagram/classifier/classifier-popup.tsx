import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { ClassElementType } from '..';
import { Button } from '../../../components/controls/button/button';
import { Divider } from '../../../components/controls/divider/divider';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Switch } from '../../../components/controls/switch/switch';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { Header } from '../../../components/controls/typography/typography';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { notEmpty } from '../../../utils/not-empty';
import { ClassAttribute } from '../class-member/class-attribute/class-attribute';
import { ClassMethod } from '../class-member/class-method/class-method';
import { Classifier } from './classifier';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

interface OwnProps {
  element: Classifier;
}

interface StateProps {
  getById: (id: string) => UMLElement | null;
}

interface DispatchProps {
  create: typeof UMLElementRepository.create;
  change: typeof UMLElementRepository.change;
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
      change: UMLElementRepository.change,
      rename: UMLElementRepository.rename,
      delete: UMLElementRepository.delete,
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
          <Switch value={element.type as ClassElementType} onChange={this.toggle} color="primary">
            <Switch.Item value={ClassElementType.AbstractClass}>
              {this.props.translate('packages.classDiagram.abstract')}
            </Switch.Item>
            <Switch.Item value={ClassElementType.Interface}>
              {this.props.translate('packages.classDiagram.interface')}
            </Switch.Item>
            <Switch.Item value={ClassElementType.Enumeration}>
              {this.props.translate('packages.classDiagram.enumeration')}
            </Switch.Item>
          </Switch>
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
          <Textfield outline={true} value="" onSubmit={this.create(ClassAttribute)} />
        </section>
        {!element.isEnumeration && (
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
            <Textfield outline={true} value="" onSubmit={this.create(ClassMethod)} />
          </section>
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
