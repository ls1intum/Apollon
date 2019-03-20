import React, { Component, SFC } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { State as ReduxState } from './../../../../components/Store';
import Element, { ElementRepository } from './../../../Element';
import ClassAssociation from './ClassAssociation';
import { RelationshipKind } from '..';
import {
  TextField,
  Section,
  Divider,
  Header,
  Trashcan,
} from '../../../../components/Popup/Controls';

import { Dropdown } from './../../../../components/controls';

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Input = styled(TextField)`
  margin-left: 0.5rem;
`;

class ClassAssociationComponent extends Component<Props> {
  private onChange = (value: RelationshipKind) => {
    const { element, change } = this.props;
    change(element.id, value);
  };

  private onUpdate = (
    type: 'multiplicity' | 'role',
    end: 'source' | 'target'
  ) => (value: string) => {
    const { element, update } = this.props;
    update(element.id, { [type]: { ...element[type], [end]: value } });
  };

  render() {
    const { element, getById } = this.props;
    const source = getById(element.source.element);
    const target = getById(element.target.element);

    return (
      <div>
        <Section>
          <Header>Association</Header>
          <Divider />
        </Section>
        <Section>
          <Dropdown value={element.kind} onChange={this.onChange}>
            <Dropdown.Item value={RelationshipKind.ClassAggregation}>
              Aggregation
            </Dropdown.Item>
            <Dropdown.Item value={RelationshipKind.ClassUnidirectional}>
              Association (unidirectional)
            </Dropdown.Item>
            <Dropdown.Item value={RelationshipKind.ClassBidirectional}>
              Association (bidirectional)
            </Dropdown.Item>
            <Dropdown.Item value={RelationshipKind.ClassComposition}>
              Composition
            </Dropdown.Item>
            <Dropdown.Item value={RelationshipKind.ClassDependency}>
              Dependency
            </Dropdown.Item>
            <Dropdown.Item value={RelationshipKind.ClassInheritance}>
              Inheritance
            </Dropdown.Item>
            <Dropdown.Item value={RelationshipKind.ClassRealization}>
              Realization
            </Dropdown.Item>
          </Dropdown>
          <Divider />
        </Section>
        <Section>
          <Header>{source.name}</Header>
          <Flex>
            <span>Multiplicity</span>
            <Input
              value={element.multiplicity.source}
              onUpdate={this.onUpdate('multiplicity', 'source')}
            />
          </Flex>
          <Flex>
            <span>Role</span>
            <Input
              value={element.role.source}
              onUpdate={this.onUpdate('role', 'source')}
            />
          </Flex>
          <Divider />
        </Section>
        <Section>
          <Header>{target.name}</Header>
          <Flex>
            <span>Multiplicity</span>
            <Input
              value={element.multiplicity.target}
              onUpdate={this.onUpdate('multiplicity', 'target')}
            />
          </Flex>
          <Flex>
            <span>Role</span>
            <Input
              value={element.role.target}
              onUpdate={this.onUpdate('role', 'target')}
            />
          </Flex>
        </Section>
      </div>
    );
  }
}

interface OwnProps {
  element: ClassAssociation;
}

interface StateProps {
  getById: (id: string) => Element;
}

interface DispatchProps {
  change: typeof ElementRepository.change;
  update: typeof ElementRepository.update;
}

type Props = OwnProps & StateProps & DispatchProps;

export default connect<StateProps, DispatchProps, OwnProps, ReduxState>(
  state => ({ getById: ElementRepository.getById(state.elements) }),
  {
    change: ElementRepository.change,
    update: ElementRepository.update,
  }
)(ClassAssociationComponent);
