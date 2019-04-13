import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { Button } from '../../../components/controls/button/button';
import { Divider } from '../../../components/controls/divider/divider';
import { ArrowRightIcon } from '../../../components/controls/icon/arrow-right';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { Body, Header } from '../../../components/controls/typography/typography';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { Element } from '../../../services/element/element';
import { ElementRepository } from '../../../services/element/element-repository';
import { Relationship } from '../../../services/relationship/relationship';
import { RelationshipRepository } from '../../../services/relationship/relationship-repository';
import { ModelState } from './../../../components/store/model-state';
import { ActivityMergeNode } from './activity-merge-node';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

class ActivityMergeNodePopupComponent extends Component<Props> {
  render() {
    const { element, relationships } = this.props;

    const decisions = relationships.filter(relationship => relationship.source.element === element.id);
    const targets = this.props.getByIds(decisions.map(relationship => relationship.target.element));

    return (
      <div>
        <section>
          <Textfield value={element.name} onChange={this.onUpdate} />
          <Divider />
        </section>
        <section>
          <Header>{this.props.translate('popup.condition')}</Header>
          {decisions.map((decision, i) => (
            <Flex key={decision.id}>
              <Textfield
                gutter={i < decisions.length - 1}
                value={decision.name}
                onChange={this.onUpdateOption(decision.id)}
              />
              <Button color="link" disabled={true}>
                <ArrowRightIcon />
              </Button>
              <Body>{targets[i].name}</Body>
            </Flex>
          ))}
        </section>
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
    state => ({
      relationships: RelationshipRepository.read(state.elements),
      getByIds: ElementRepository.getByIds(state.elements),
    }),
    {
      rename: ElementRepository.rename,
    },
  ),
);

export const ActivityMergeNodePopup = enhance(ActivityMergeNodePopupComponent);
