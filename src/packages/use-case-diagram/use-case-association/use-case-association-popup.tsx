import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { UseCaseRelationshipType } from '..';
import { Divider } from '../../../components/controls/divider/divider';
import { Dropdown } from '../../../components/controls/dropdown/dropdown';
import { FlipIcon } from '../../../components/controls/flip-icon';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { Header } from '../../../components/popup/controls/header';
import { Element } from '../../../services/element/element';
import { ElementRepository } from '../../../services/element/element-repository';
import { RelationshipRepository } from '../../../services/relationship/relationship-repository';
import { ModelState } from './../../../components/store/model-state';
import { UseCaseAssociation } from './use-case-association';

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Input = styled(Textfield)`
  margin-left: 0.5rem;
`;

class UseCaseAssociationComponent extends Component<Props> {
  render() {
    const { element, getById } = this.props;
    const source = getById(element.source.element);
    const target = getById(element.target.element);

    return (
      <div>
        <section>
          {element.type === UseCaseRelationshipType.UseCaseAssociation ? (
            <Textfield value={element.name} onChange={this.rename(element.id)} />
          ) : (
            <Flex>
              <Header>
                {
                  {
                    [UseCaseRelationshipType.UseCaseAssociation]: this.props.translate('packages.useCaseDiagram.association'),
                    [UseCaseRelationshipType.UseCaseGeneralization]: this.props.translate('packages.useCaseDiagram.generalization'),
                    [UseCaseRelationshipType.UseCaseInclude]: this.props.translate('packages.useCaseDiagram.include'),
                    [UseCaseRelationshipType.UseCaseExtend]: this.props.translate('packages.useCaseDiagram.extend'),
                  }[element.type]
                }
              </Header>
              <FlipIcon fill="black" onClick={() => this.props.flip(element.id)} />
            </Flex>
          )}
          <Divider />
        </section>
        <section>
          <Dropdown value={element.type} onChange={this.onChange}>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseAssociation}>
              {this.props.translate('packages.useCaseDiagram.association')}
            </Dropdown.Item>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseGeneralization}>
              {this.props.translate('packages.useCaseDiagram.generalization')}
            </Dropdown.Item>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseInclude}>
              {this.props.translate('packages.useCaseDiagram.include')}
            </Dropdown.Item>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseExtend}>
              {this.props.translate('packages.useCaseDiagram.extend')}
            </Dropdown.Item>
          </Dropdown>
        </section>
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
  flip: typeof RelationshipRepository.flip;
}

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({ getById: ElementRepository.getById(state.elements) }),
    {
      rename: ElementRepository.rename,
      change: ElementRepository.change,
      update: ElementRepository.update,
      flip: RelationshipRepository.flip,
    },
  ),
);

export const UseCaseAssociationPopup = enhance(UseCaseAssociationComponent);
