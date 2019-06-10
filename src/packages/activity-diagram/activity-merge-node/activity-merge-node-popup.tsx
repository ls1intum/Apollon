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
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { UMLRelationshipRepository } from '../../../services/uml-relationship/uml-relationship-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { notEmpty } from '../../../utils/not-empty';
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
    const targets = decisions.map(relationship => this.props.getById(relationship.target.element)).filter(notEmpty);

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

  private onUpdate = (name: string) => {
    const { element, update } = this.props;
    update(element.id, { name });
  };

  private onUpdateOption = (id: string) => (name: string) => {
    const { update } = this.props;
    update(id, { name });
  };
}

type OwnProps = {
  element: ActivityMergeNode;
};

type StateProps = {
  relationships: UMLRelationship[];
};

type DispatchProps = {
  update: typeof UMLElementRepository.update;
  getById: (id: string) => UMLElement | null;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({
      relationships: UMLRelationshipRepository.read(state.elements),
    }),
    {
      update: UMLElementRepository.update,
      getById: (UMLElementRepository.getById as any) as AsyncDispatch<typeof UMLElementRepository.getById>,
    },
  ),
);

export const ActivityMergeNodePopup = enhance(ActivityMergeNodePopupComponent);
