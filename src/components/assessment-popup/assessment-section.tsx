import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { IAssessment } from '../../services/assessment/assessment';
import { AssessmentRepository } from '../../services/assessment/assessment-repository';
import { Element } from '../../services/element/element';
import { Divider } from '../controls/divider/divider';
import { Textfield } from '../controls/textfield/textfield';
import { Header } from '../controls/typography/typography';
import { I18nContext } from '../i18n/i18n-context';
import { localized } from '../i18n/localized';
import { ModelState } from '../store/model-state';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type OwnProps = {
  element: Element;
  last: boolean;
};

type StateProps = {
  readonly: boolean;
  assessment: IAssessment | null;
};
type DispatchProps = { assess: typeof AssessmentRepository.assess };
type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state, props) => ({
      readonly: state.editor.readonly,
      assessment: AssessmentRepository.getById(state.assessments)(props.element.id),
    }),
    { assess: AssessmentRepository.assess },
  ),
);

class AssessmentSectionCompoennt extends Component<Props> {
  render() {
    const { element, assessment, readonly, last } = this.props;

    return (
      <>
        <section>
          <Header>{this.props.translate('assessment.assessment')} {element.name}</Header>
        </section>
        <section>
          <Flex>
            <span style={{ marginRight: '0.5rem' }}>{this.props.translate('assessment.score')}:</span>
            {readonly ? (
              <span>{(assessment && assessment.score) || '-'}</span>
              ) : (
                <Textfield gutter={true} type="number" step={0.5} onChange={this.updateScore} value={assessment ? String(assessment.score) : ''} />
              )}
          </Flex>
        </section>
        {readonly ? (
          assessment && assessment.feedback && <section>{assessment.feedback}</section>
        ) : (
          <section>
            <Textfield
              placeholder={this.props.translate('assessment.feedback')}
              onChange={this.updateFeedback}
              value={assessment && assessment.feedback ? assessment.feedback : ''}
            />
          </section>
        )}
        {!last && <Divider />}
      </>
    );
  }

  private updateScore = (value: string) => {
    const { element, assessment } = this.props;
    const score = parseFloat(value) || 0;
    this.props.assess(element.id, { ...assessment, score });
  };

  private updateFeedback = (value: string) => {
    const { element, assessment } = this.props;
    const feedback = value.length ? value : undefined;
    this.props.assess(element.id, { score: 0, ...assessment, feedback });
  };
}

export const AssessmentSection = enhance(AssessmentSectionCompoennt);
