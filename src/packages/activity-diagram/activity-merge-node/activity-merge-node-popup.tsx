import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { Divider } from '../../../components/popup/controls/divider';
import { Header } from '../../../components/popup/controls/header';
import { Section } from '../../../components/popup/controls/section';
import { TextField } from '../../../components/popup/controls/textfield';
import { Element } from '../../../services/element/element';
import { ElementRepository } from '../../../services/element/element-repository';
import { Relationship } from '../../../services/relationship/relationship';
import { RelationshipRepository } from '../../../services/relationship/relationship-repository';
import { ModelState } from './../../../components/store/model-state';
import { ActivityMergeNode } from './activity-merge-node';

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

class ActivityMergeNodePopupComponent extends Component<Props> {
  render() {
    const { element, relationships } = this.props;

    const decisions = relationships.filter(relationship => relationship.source.element === element.id);
    const targets = this.props.getByIds(decisions.map(relationship => relationship.target.element));

    return (
      <div>
        <Section>
          <TextField value={element.name} onUpdate={this.onUpdate} />
          <Divider />
        </Section>
        <Section>
          <Header>{this.props.translate('popup.condition')}</Header>
          {decisions.map((decision, i) => (
            <Flex key={decision.id}>
              <span>→&nbsp;{targets[i].name}&nbsp;</span>
              <TextField value={decision.name} onUpdate={this.onUpdateOption(decision.id)} />
            </Flex>
          ))}
        </Section>
      </div>
    );
  }

  private onUpdate = (value: string) => {
    const { element, rename } = this.props;
    rename(element.id, value);
  };

  private onUpdateOption = (id: string) => (value: string) => {
    const { rename } = this.props;
    rename(id, value);
  };
}

type OwnProps = {
  element: ActivityMergeNode;
};

type StateProps = {
  relationships: Relationship[];
  getByIds: (id: string[]) => Element[];
};

type DispatchProps = {
  rename: typeof ElementRepository.rename;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({ relationships: RelationshipRepository.read(state.elements), getByIds: ElementRepository.getByIds(state.elements) }),
    {
      rename: ElementRepository.rename,
    },
  ),
);

export const ActivityMergeNodePopup = enhance(ActivityMergeNodePopupComponent);
