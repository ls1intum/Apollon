import React, { Component, SFC } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { State as ReduxState } from './../../../../components/Store';
import Element, { ElementRepository } from './../../../Element';
import UseCaseAssociation from './UseCaseAssociation';
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

class UseCaseAssociationPopup extends Component<Props> {
  private rename = (id: string) => (value: string) => {
    this.props.rename(id, value);
  };

  private onChange = (value: RelationshipKind) => {
    const { element, change } = this.props;
    change(element.id, value);
  };

  render() {
    const { element, getById } = this.props;
    const source = getById(element.source.element);
    const target = getById(element.target.element);

    return (
      <div>
        <Section>
          {element.kind === RelationshipKind.UseCaseAssociation ? (
            <TextField
              value={element.name}
              onUpdate={this.rename(element.id)}
            />
          ) : (
            <Header>
              {
                {
                  [RelationshipKind.UseCaseAssociation]: 'Association',
                  [RelationshipKind.UseCaseGeneralization]: 'Generalization',
                  [RelationshipKind.UseCaseInclude]: 'Include',
                  [RelationshipKind.UseCaseExtend]: 'Extend',
                }[element.kind]
              }
            </Header>
          )}
          <Divider />
        </Section>
        <Section>
          <Dropdown value={element.kind} onChange={this.onChange}>
            <Dropdown.Item value={RelationshipKind.UseCaseAssociation}>
              Association
            </Dropdown.Item>
            <Dropdown.Item value={RelationshipKind.UseCaseGeneralization}>
              Generalization
            </Dropdown.Item>
            <Dropdown.Item value={RelationshipKind.UseCaseInclude}>
              Include
            </Dropdown.Item>
            <Dropdown.Item value={RelationshipKind.UseCaseExtend}>
              Extend
            </Dropdown.Item>
          </Dropdown>
        </Section>
      </div>
    );
  }
}

interface OwnProps {
  element: UseCaseAssociation;
}

interface StateProps {
  getById: (id: string) => Element;
}

interface DispatchProps {
  rename: typeof ElementRepository.rename;
  change: typeof ElementRepository.change;
  update: typeof ElementRepository.update;
}

type Props = OwnProps & StateProps & DispatchProps;

export default connect<StateProps, DispatchProps, OwnProps, ReduxState>(
  state => ({ getById: ElementRepository.getById(state.elements) }),
  {
    rename: ElementRepository.rename,
    change: ElementRepository.change,
    update: ElementRepository.update,
  }
)(UseCaseAssociationPopup);
