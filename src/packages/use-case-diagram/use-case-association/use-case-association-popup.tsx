import React, { Component, SFC } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { UseCaseRelationshipType } from '..';
import { Dropdown } from '../../../components/controls/dropdown';
import { Divider } from '../../../components/popup/controls/divider';
import { Header } from '../../../components/popup/controls/header';
import { Section } from '../../../components/popup/controls/section';
import { TextField } from '../../../components/popup/controls/textfield';
import { Element } from '../../../services/element/element';
import { ElementRepository } from '../../../services/element/element-repository';
import { ModelState } from './../../../components/store/model-state';
import { UseCaseAssociation } from './use-case-association';

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Input = styled(TextField)`
  margin-left: 0.5rem;
`;

class UseCaseAssociationComponent extends Component<Props> {

  render() {
    const { element, getById } = this.props;
    const source = getById(element.source.element);
    const target = getById(element.target.element);

    return (
      <div>
        <Section>
          {element.type === UseCaseRelationshipType.UseCaseAssociation ? (
            <TextField value={element.name} onUpdate={this.rename(element.id)} />
          ) : (
            <Header>
              {
                {
                  [UseCaseRelationshipType.UseCaseAssociation]: 'Association',
                  [UseCaseRelationshipType.UseCaseGeneralization]: 'Generalization',
                  [UseCaseRelationshipType.UseCaseInclude]: 'Include',
                  [UseCaseRelationshipType.UseCaseExtend]: 'Extend',
                }[element.type]
              }
            </Header>
          )}
          <Divider />
        </Section>
        <Section>
          <Dropdown value={element.type} onChange={this.onChange}>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseAssociation}>Association</Dropdown.Item>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseGeneralization}>Generalization</Dropdown.Item>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseInclude}>Include</Dropdown.Item>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseExtend}>Extend</Dropdown.Item>
          </Dropdown>
        </Section>
      </div>
    );
  }
  private rename = (id: string) => (value: string) => {
    this.props.rename(id, value);
  };

  private onChange = (value: UseCaseRelationshipType) => {
    const { element, change } = this.props;
    change(element.id, value);
  };
}

interface OwnProps {
  element: UseCaseAssociation;
}

interface StateProps {
  getById: (id: string) => Element | null;
}

interface DispatchProps {
  rename: typeof ElementRepository.rename;
  change: typeof ElementRepository.change;
  update: typeof ElementRepository.update;
}

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  state => ({ getById: ElementRepository.getById(state.elements) }),
  {
    rename: ElementRepository.rename,
    change: ElementRepository.change,
    update: ElementRepository.update,
  }
);

export const UseCaseAssociationPopup = enhance(UseCaseAssociationComponent);
