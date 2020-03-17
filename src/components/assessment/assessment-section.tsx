import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { IAssessment } from '../../services/assessment/assessment';
import { AssessmentRepository } from '../../services/assessment/assessment-repository';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { Divider } from '../controls/divider/divider';
import { Textfield } from '../controls/textfield/textfield';
import { Header } from '../controls/typography/typography';
import { I18nContext } from '../i18n/i18n-context';
import { localized } from '../i18n/localized';
import { ModelState } from '../store/model-state';
import { styled } from '../theme/styles';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

const Section = styled.section<{ pointerEventsEnabled: boolean }>`
  pointer-events: ${props => (props.pointerEventsEnabled ? 'auto' : 'none')};
`;

type OwnProps = {
  element: IUMLElement;
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

const initialState = {
  dragOver: false,
};

type State = typeof initialState;

class AssessmentSectionCompoennt extends Component<Props, State> {
  state = initialState;

  render() {
    const { element, assessment, readonly } = this.props;

    return (
      <div
        className="artemis-instruction-dropzone"
        onDrop={this.onDrop}
        onDragOver={this.onDragOver}
        onDragEnter={this.onDragEnter}
        onDragLeave={this.onDragLeave}
      >
        <Section pointerEventsEnabled={!this.state.dragOver}>
          <Header>
            {this.props.translate('assessment.assessment')} {element.name} test
          </Header>
        </Section>
        <Section pointerEventsEnabled={!this.state.dragOver}>
          <Flex>
            <span style={{ marginRight: '0.5em' }}>{this.props.translate('assessment.score')}:</span>
            {readonly ? (
              <span>{(assessment && assessment.score) || '-'}</span>
            ) : (
              <Textfield
                gutter={true}
                type="number"
                step={0.5}
                onChange={this.updateScore}
                value={assessment ? String(assessment.score) : ''}
              />
            )}
          </Flex>
        </Section>
        {readonly ? (
          assessment && assessment.feedback && <section>{assessment.feedback}</section>
        ) : (
          <Section pointerEventsEnabled={!this.state.dragOver}>
            <Textfield
              multiline={true}
              placeholder={this.props.translate('assessment.feedback')}
              onChange={this.updateFeedback}
              value={assessment && assessment.feedback ? assessment.feedback : ''}
            />
          </Section>
        )}
        <Divider />
      </div>
    );
  }

  /**
   * implement so that elements can be dropped
   * @param ev DragEvent
   */
  private onDragOver = (ev: any) => {
    // prevent default to allow drop
    ev.preventDefault();
    // disable pointer events of children
    this.setState({ dragOver: true });
  };

  /**
   * implement so that elements can be dropped
   * @param ev DragEvent
   */
  private onDragEnter = (ev: any) => {
    if (ev.target.className.includes('artemis-instruction-dropzone')) {
      ev.target.style.border = 'solid';
    }
  };

  /**
   * implement so that elements can be dropped
   * @param ev DragEvent
   */
  private onDragLeave = (ev: any) => {
    if (ev.target.className.includes('artemis-instruction-dropzone')) {
      ev.target.style.border = '';
    }
    // enable pointer events of children
    this.setState({ dragOver: false });
  };

  /**
   * Artemis instruction object can be dropped on assessment sections to automatically fill assessment
   * @param ev DropEvent
   */
  private onDrop = (ev: any) => {
    // prevent default action (open as link for some elements)
    ev.preventDefault();
    if (ev.target.className.includes('artemis-instruction-dropzone')) {
      ev.target.style.border = '';
    }
    // enable pointer events of children
    this.setState({ dragOver: false });

    const { element, assessment } = this.props;
    const data = ev.dataTransfer.getData('text');
    const instruction = JSON.parse(data);
    const score = instruction.credits;
    const feedback = instruction.feedback;
    this.props.assess(element.id, { ...assessment, score, feedback });
  };

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
