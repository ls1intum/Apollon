import React, { Component, SFC } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { State as ReduxState } from './../../../../components/Store';
import Element, { ElementRepository } from './../../../Element';
import ClassAssociation from './ClassAssociation';
import { RelationshipKind } from '..';
import {
  Dropdown,
  DropdownItem,
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

const NewMember = styled(TextField)`
  &:not(:focus):not(:hover) {
    background: rgba(255, 255, 255, 0.5);
  }

  &:not(:focus) {
    border-style: dashed;
  }
`;

class ClassAssociationComponent extends Component<Props> {
  private onChange = (event: React.FormEvent<HTMLSelectElement>) => {
    const { value } = event.currentTarget;
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
            <DropdownItem value={RelationshipKind.ClassAggregation}>
              Aggregation
            </DropdownItem>
            <DropdownItem value={RelationshipKind.ClassUnidirectional}>
              Association (unidirectional)
            </DropdownItem>
            <DropdownItem value={RelationshipKind.ClassBidirectional}>
              Association (bidirectional)
            </DropdownItem>
            <DropdownItem value={RelationshipKind.ClassComposition}>
              Composition
            </DropdownItem>
            <DropdownItem value={RelationshipKind.ClassDependency}>
              Dependency
            </DropdownItem>
            <DropdownItem value={RelationshipKind.ClassInheritance}>
              Inheritance
            </DropdownItem>
            <DropdownItem value={RelationshipKind.ClassRealization}>
              Realization
            </DropdownItem>
          </Dropdown>
          <Divider />
        </Section>
        <Section>
          <Header>{source.name}</Header>
          <Flex>
            <span>Multiplicity</span>
            <TextField
              value={element.multiplicity.source}
              onUpdate={this.onUpdate('multiplicity', 'source')}
            />
          </Flex>
          <Flex>
            <span>Role</span>
            <TextField
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
            <TextField
              value={element.multiplicity.target}
              onUpdate={this.onUpdate('multiplicity', 'target')}
            />
          </Flex>
          <Flex>
            <span>Role</span>
            <TextField
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
