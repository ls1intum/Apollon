import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { ExchangeIcon } from '../../../components/controls/icon/exchange';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { Header } from '../../../components/controls/typography/typography';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ElementRepository } from '../../../services/element/element-repository';
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
        <section>
          <Flex>
            <Header>{this.props.translate('packages.activityDiagram.controlFlow')}</Header>
            <ExchangeIcon fill="black" onClick={() => this.props.flip(element.id)} />
          </Flex>
        </section>
        <section>
          <Textfield value={element.name} onChange={this.rename} />
        </section>
      </div>
    );
  }

  private rename = (value: string) => {
    this.props.rename(this.props.element.id, value);
  };
}

type OwnProps = {
  element: ActivityControlFlow;
};

type StateProps = {};

type DispatchProps = {
  rename: typeof ElementRepository.rename;
  flip: typeof RelationshipRepository.flip;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    null,
    {
      rename: ElementRepository.rename,
      flip: RelationshipRepository.flip,
    },
  ),
);

export const ActivityControlFlowPopup = enhance(ActivityControlFlowPopupComponent);
