import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { ClassRelationshipType } from '..';
import { Divider } from '../../../components/controls/divider/divider';
import { Dropdown } from '../../../components/controls/dropdown/dropdown';
import { FlipIcon } from '../../../components/controls/flip-icon';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { Header } from '../../../components/popup/controls/header';
import { TextField } from '../../../components/popup/controls/textfield';
import { ModelState } from '../../../components/store/model-state';
import { Element } from '../../../services/element/element';
import { ElementRepository } from '../../../services/element/element-repository';
import { RelationshipRepository } from '../../../services/relationship/relationship-repository';
import { ClassAssociation } from './class-association';

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Input = styled(TextField)`
  margin-left: 0.5rem;
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
            <Header>{this.props.translate('popup.association')}</Header>
            <FlipIcon fill="black" onClick={() => this.props.flip(element.id)} />
          </Flex>
          <Divider />
        </section>
        <section>
          <Dropdown value={element.type as ClassRelationshipType} onChange={this.onChange}>
            <Dropdown.Item value={ClassRelationshipType.ClassAggregation}>{this.props.translate('packages.classDiagram.aggregation')}</Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassUnidirectional}>{this.props.translate('packages.classDiagram.unidirectional')}</Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassBidirectional}>{this.props.translate('packages.classDiagram.bidirectional')}</Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassComposition}>{this.props.translate('packages.classDiagram.composition')}</Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassDependency}>{this.props.translate('packages.classDiagram.dependency')}</Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassInheritance}>{this.props.translate('packages.classDiagram.inheritance')}</Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassRealization}>{this.props.translate('packages.classDiagram.realization')}</Dropdown.Item>
          </Dropdown>
          <Divider />
        </section>
        <section>
          <Header>{source.name}</Header>
          <Flex>
            <span>{this.props.translate('popup.multiplicity')}</span>
            <Input value={element.multiplicity.source} onUpdate={this.onUpdate('multiplicity', 'source')} />
          </Flex>
          <Flex>
            <span>{this.props.translate('popup.role')}</span>
            <Input value={element.role.source} onUpdate={this.onUpdate('role', 'source')} />
          </Flex>
          <Divider />
        </section>
        <section>
          <Header>{target.name}</Header>
          <Flex>
            <span>{this.props.translate('popup.multiplicity')}</span>
            <Input value={element.multiplicity.target} onUpdate={this.onUpdate('multiplicity', 'target')} />
          </Flex>
          <Flex>
            <span>{this.props.translate('popup.role')}</span>
            <Input value={element.role.target} onUpdate={this.onUpdate('role', 'target')} />
          </Flex>
        </section>
      </div>
    );
  }
  private onChange = (value: ClassRelationshipType) => {
    const { element, change } = this.props;
    change(element.id, value);
  };

  private onUpdate = (type: 'multiplicity' | 'role', end: 'source' | 'target') => (value: string) => {
    const { element, update } = this.props;
    update(element.id, { [type]: { ...element[type], [end]: value } });
  };
}

type OwnProps = {
  element: ClassAssociation;
};

type StateProps = {
  getById: (id: string) => Element | null;
};

type DispatchProps = {
  change: typeof ElementRepository.change;
  update: typeof ElementRepository.update;
  flip: typeof RelationshipRepository.flip;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({ getById: ElementRepository.getById(state.elements) }),
    {
      change: ElementRepository.change,
      update: ElementRepository.update,
      flip: RelationshipRepository.flip,
    },
  ),
);

export const ClassAssociationPopup = enhance(ClassAssociationComponent);
