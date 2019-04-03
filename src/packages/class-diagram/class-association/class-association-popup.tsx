import React, { Component } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ClassRelationshipType } from '..';
import { Dropdown } from '../../../components/controls/dropdown';
import { FlipIcon } from '../../../components/controls/flip-icon';
import { Divider } from '../../../components/popup/controls/divider';
import { Header } from '../../../components/popup/controls/header';
import { Section } from '../../../components/popup/controls/section';
import { TextField } from '../../../components/popup/controls/textfield';
import { ModelState } from '../../../components/store/model-state';
import { Element } from '../../../services/element/element';
import { ElementRepository } from '../../../services/element/element-repository';
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
        <Section>
          <Flex>
            <Header>Association</Header>
            <FlipIcon fill="black" />
          </Flex>
          <Divider />
        </Section>
        <Section>
          <Dropdown value={element.type} onChange={this.onChange}>
            <Dropdown.Item value={ClassRelationshipType.ClassAggregation}>Aggregation</Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassUnidirectional}>Association (unidirectional)</Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassBidirectional}>Association (bidirectional)</Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassComposition}>Composition</Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassDependency}>Dependency</Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassInheritance}>Inheritance</Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassRealization}>Realization</Dropdown.Item>
          </Dropdown>
          <Divider />
        </Section>
        <Section>
          <Header>{source.name}</Header>
          <Flex>
            <span>Multiplicity</span>
            <Input value={element.multiplicity.source} onUpdate={this.onUpdate('multiplicity', 'source')} />
          </Flex>
          <Flex>
            <span>Role</span>
            <Input value={element.role.source} onUpdate={this.onUpdate('role', 'source')} />
          </Flex>
          <Divider />
        </Section>
        <Section>
          <Header>{target.name}</Header>
          <Flex>
            <span>Multiplicity</span>
            <Input value={element.multiplicity.target} onUpdate={this.onUpdate('multiplicity', 'target')} />
          </Flex>
          <Flex>
            <span>Role</span>
            <Input value={element.role.target} onUpdate={this.onUpdate('role', 'target')} />
          </Flex>
        </Section>
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
};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  state => ({ getById: ElementRepository.getById(state.elements) }),
  {
    change: ElementRepository.change,
    update: ElementRepository.update,
  },
);

export const ClassAssociationPopup = enhance(ClassAssociationComponent);
