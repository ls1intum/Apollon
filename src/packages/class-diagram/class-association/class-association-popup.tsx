import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { ClassRelationshipType } from '..';
import { Button } from '../../../components/controls/button/button';
import { Divider } from '../../../components/controls/divider/divider';
import { Dropdown } from '../../../components/controls/dropdown/dropdown';
import { ExchangeIcon } from '../../../components/controls/icon/exchange';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { Body, Header } from '../../../components/controls/typography/typography';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { UMLRelationshipRepository } from '../../../services/uml-relationship/uml-relationship-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { ClassAssociation } from './class-association';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

class ClassAssociationComponent extends Component<Props> {
  render() {
    const { element, getById } = this.props;
    const source = getById(element.source.element);
    const target = getById(element.target.element);
    if (!source || !target) return null;

    return (
      <div>
        <section>
          <Flex>
            <Header gutter={false} style={{ flexGrow: 1 }}>
              {this.props.translate('popup.association')}
            </Header>
            <Button color="link" onClick={() => this.props.flip(element.id)}>
              <ExchangeIcon />
            </Button>
            <Button color="link" onClick={() => this.props.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
          <Divider />
        </section>
        <section>
          <Dropdown value={element.type as ClassRelationshipType} onChange={this.onChange}>
            <Dropdown.Item value={ClassRelationshipType.ClassAggregation}>
              {this.props.translate('packages.classDiagram.aggregation')}
            </Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassUnidirectional}>
              {this.props.translate('packages.classDiagram.unidirectional')}
            </Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassBidirectional}>
              {this.props.translate('packages.classDiagram.bidirectional')}
            </Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassComposition}>
              {this.props.translate('packages.classDiagram.composition')}
            </Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassDependency}>
              {this.props.translate('packages.classDiagram.dependency')}
            </Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassInheritance}>
              {this.props.translate('packages.classDiagram.inheritance')}
            </Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassRealization}>
              {this.props.translate('packages.classDiagram.realization')}
            </Dropdown.Item>
          </Dropdown>
          <Divider />
        </section>
        <section>
          <Header>{source.name}</Header>
          <Flex>
            <Body style={{ marginRight: '0.5em' }}>{this.props.translate('popup.multiplicity')}</Body>
            <Textfield
              gutter={true}
              value={element.multiplicity.source}
              onChange={this.onUpdate('multiplicity', 'source')}
            />
          </Flex>
          <Flex>
            <Body style={{ marginRight: '0.5em' }}>{this.props.translate('popup.role')}</Body>
            <Textfield value={element.role.source} onChange={this.onUpdate('role', 'source')} />
          </Flex>
          <Divider />
        </section>
        <section>
          <Header>{target.name}</Header>
          <Flex>
            <Body style={{ marginRight: '0.5em' }}>{this.props.translate('popup.multiplicity')}</Body>
            <Textfield
              gutter={true}
              value={element.multiplicity.target}
              onChange={this.onUpdate('multiplicity', 'target')}
            />
          </Flex>
          <Flex>
            <Body style={{ marginRight: '0.5em' }}>{this.props.translate('popup.role')}</Body>
            <Textfield value={element.role.target} onChange={this.onUpdate('role', 'target')} />
          </Flex>
        </section>
      </div>
    );
  }
  private onChange = (type: ClassRelationshipType) => {
    const { element, update } = this.props;
    update(element.id, { type });
  };

  private onUpdate = (type: 'multiplicity' | 'role', end: 'source' | 'target') => (value: string) => {
    const { element, update } = this.props;
    update(element.id, { [type]: { ...element[type], [end]: value } });
  };
}

type OwnProps = {
  element: ClassAssociation;
};

type StateProps = {};

type DispatchProps = {
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
  flip: typeof UMLRelationshipRepository.flip;
  getById: (id: string) => UMLElement | null;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    null,
    {
      update: UMLElementRepository.update,
      delete: UMLElementRepository.delete,
      flip: UMLRelationshipRepository.flip,
      getById: (UMLElementRepository.getById as any) as AsyncDispatch<typeof UMLElementRepository.getById>,
    },
  ),
);

export const ClassAssociationPopup = enhance(ClassAssociationComponent);
