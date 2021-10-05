import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { UMLDiagramType } from '../..';
import { IAssessment } from '../../services/assessment/assessment';
import { AssessmentRepository } from '../../services/assessment/assessment-repository';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { FeedbackCorrectionStatus } from '../../typings';
import { Divider } from '../controls/divider/divider';
import { Textfield } from '../controls/textfield/textfield';
import { TrashIcon } from '../../components/controls/icon/trash';
import { Button } from '../controls/button/button';
import { Header } from '../controls/typography/typography';
import { I18nContext } from '../i18n/i18n-context';
import { localized } from '../i18n/localized';
import { ModelState } from '../store/model-state';
import { styled } from '../theme/styles';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { AssessmentDropInfoTooltip } from './assessment-dropInfo-tooltip';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

const Action = styled.span`
  margin-top: 10px;
  font-size: 12px;
`;

type BadgeProps = {
  color?: string;
};

const Badge = styled.div<BadgeProps>`
  color: white;
  background-color: ${(props) => props.color || 'grey'};
  text-align: center;
  margin: 0.4rem auto 0 auto;
  padding: 0.25em 0.4em;
  border-radius: 0.15rem;
  font-size: 12px;
  font-weight: bold;
`;

type OwnProps = {
  element: IUMLElement;
};

type StateProps = {
  readonly: boolean;
  assessment: IAssessment | null;
  diagramType: UMLDiagramType;
};
type DispatchProps = {
  assess: typeof AssessmentRepository.assess;
  delete: typeof AssessmentRepository.delete;
  updateEndAll: typeof UMLElementRepository.updateEndAll;
};
type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state, props) => ({
      readonly: state.editor.readonly,
      assessment: AssessmentRepository.getById(state.assessments)(props.element.id),
      diagramType: state.diagram.type,
    }),
    {
      assess: AssessmentRepository.assess,
      delete: AssessmentRepository.delete,
      updateEndAll: UMLElementRepository.updateEndAll,
    },
  ),
);

class AssessmentSectionComponent extends Component<Props> {
  render() {
    const { element, assessment, readonly, diagramType } = this.props;
    return (
      <>
        <section>
          <Header>
            {this.props.translate('assessment.assessment')}{' '}
            {this.props.translate(`packages.${diagramType}.${element.type}`)}
            {element.name ? (
              <>
                {' '}
                <span style={{ display: 'inline-block' }}>{`\"${element.name}\"`}</span>
              </>
            ) : (
              ''
            )}
          </Header>
          {assessment?.dropInfo ? (
            <AssessmentDropInfoTooltip assessment={assessment} element={element} readonly={readonly} />
          ) : null}
        </section>
        <section>
          <Flex>
            <span style={{ marginRight: '0.5em' }}>{this.props.translate('assessment.score')}:</span>
            {readonly ? (
              <span>{(assessment && assessment.score) || '-'}</span>
            ) : (
              <Textfield
                gutter
                type="number"
                step={0.5}
                onChange={this.updateScore}
                value={assessment ? String(assessment.score) : ''}
              />
            )}
            {!readonly ? (
              <Button color="link" onClick={this.deleteFeedback}>
                <TrashIcon />
              </Button>
            ) : null}
          </Flex>
        </section>
        {readonly ? (
          assessment && assessment.feedback && <section>{assessment.feedback}</section>
        ) : (
          <section>
            <Textfield
              multiline
              placeholder={this.props.translate('assessment.feedback')}
              onChange={this.updateFeedback}
              enterToSubmit={false}
              value={assessment && assessment.feedback ? assessment.feedback : ''}
            />
            {assessment?.label ? (
              <Flex>
                <Badge color={assessment?.labelColor}>{assessment?.label}</Badge>
              </Flex>
            ) : null}
            {element?.assessmentNote ? (
              <Flex>
                <Action>{element.assessmentNote}</Action>
              </Flex>
            ) : null}

            {assessment?.correctionStatus?.description ? (
              <Flex>
                <span>{assessment.correctionStatus.description}</span>
              </Flex>
            ) : null}
          </section>
        )}
        <Divider />
      </>
    );
  }

  private updateScore = (value: string) => {
    const { element, assessment } = this.props;
    const score = parseFloat(value) || 0;
    const newCorrectionStatus: FeedbackCorrectionStatus = {
      description: undefined,
      status: 'NOT_VALIDATED',
    };
    this.props.assess(element.id, {
      ...assessment,
      correctionStatus: newCorrectionStatus,
      score,
    });
  };

  private updateFeedback = (value: string) => {
    const { element, assessment } = this.props;
    const feedback = value.length ? value : undefined;
    this.props.assess(element.id, { score: 0, ...assessment, feedback });
  };

  private deleteFeedback = () => {
    this.props.updateEndAll();
    this.props.delete(this.props.element.id);
  };
}

export const AssessmentSection = enhance(AssessmentSectionComponent);
