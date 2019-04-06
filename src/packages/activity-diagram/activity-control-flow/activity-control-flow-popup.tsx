import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { FlipIcon } from '../../../components/controls/flip-icon';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { Header } from '../../../components/popup/controls/header';
import { Section } from '../../../components/popup/controls/section';
import { RelationshipRepository } from '../../../services/relationship/relationship-repository';
import { ModelState } from './../../../components/store/model-state';
import { ActivityControlFlow } from './activity-control-flow';

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

class ActivityControlFlowPopupComponent extends Component<Props> {
  render() {
    const { element } = this.props;

    return (
      <div>
        <Section>
          <Flex>
            <Header>{this.props.translate('packages.activityDiagram.controlFlow')}</Header>
            <FlipIcon fill="black" onClick={() => this.props.flip(element.id)} />
          </Flex>
        </Section>
      </div>
    );
  }
}

type OwnProps = {
  element: ActivityControlFlow;
};

type StateProps = {};

type DispatchProps = {
  flip: typeof RelationshipRepository.flip;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    null,
    {
      flip: RelationshipRepository.flip,
    },
  ),
);

export const ActivityControlFlowPopup = enhance(ActivityControlFlowPopupComponent);
