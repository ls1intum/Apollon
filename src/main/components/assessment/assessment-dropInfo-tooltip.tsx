import React, { Component, ComponentClass } from 'react';
import { IAssessment } from '../../services/assessment/assessment';
import { Button } from '../controls/button/button';
import { LinkIcon } from '../controls/icon/link';
import { TrashIcon } from '../controls/icon/trash';
import { I18nContext } from '../i18n/i18n-context';
import ReactTooltip from 'react-tooltip';
import { AssessmentRepository } from '../../services/assessment/assessment-repository';
import { compose } from 'redux';
import { localized } from '../i18n/localized';
import { connect } from 'react-redux';
import { ModelState } from '../store/model-state';
import { IUMLElement } from '../../services/uml-element/uml-element';

type OwnProps = {
  assessment: IAssessment | null;
  element: IUMLElement;
  readonly: boolean;
};

type StateProps = {};

type DispatchProps = { assess: typeof AssessmentRepository.assess };
type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, { assess: AssessmentRepository.assess }),
);

const initialState = Object.freeze({
  showLinkIcon: true as boolean,
});

type State = typeof initialState;

class AssessmentDropInfoTooltipComponent extends Component<Props, State> {
  state = initialState;

  render() {
    const { assessment, readonly } = this.props;
    const message = assessment?.dropInfo.tooltipMessage;
    return (
      <div>
        {readonly ? (
          <Button color="link" tabIndex={-1} data-tip data-for="tooltip">
            <LinkIcon />
          </Button>
        ) : this.state.showLinkIcon ? (
          <Button color="link" tabIndex={-1} data-tip data-for="tooltip" onClick={this.toggle}>
            <LinkIcon />
          </Button>
        ) : (
          <Button
            color="link"
            tabIndex={-1}
            data-tip
            data-for="tooltip"
            onClick={this.removeLink}
            onMouseLeave={this.toggle}
          >
            <TrashIcon />
          </Button>
        )}

        <ReactTooltip id="tooltip" place="right" effect="solid">
          {this.state.showLinkIcon ? message : assessment?.dropInfo.removeMessage}
        </ReactTooltip>
      </div>
    );
  }

  private toggle = () => {
    this.setState({ showLinkIcon: !this.state.showLinkIcon });
  };

  private removeLink = () => {
    const { element, assessment } = this.props;
    this.props.assess(element.id, { ...assessment } as IAssessment, 'MANUAL');
  };
}

export const AssessmentDropInfoTooltip = enhance(AssessmentDropInfoTooltipComponent);
