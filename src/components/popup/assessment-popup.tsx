import React, { Component } from 'react';
import { connect } from 'react-redux';
import { AssessmentRepository } from '../../services/assessment/assessment-repository';
import { Element } from '../../services/element/element';
import { Assessment } from '../../typings';
import { ModelState } from '../store/model-state';
import { Divider } from './controls/divider';
import { Header } from './controls/header';
import { Section } from './controls/section';
import { TextField } from './controls/textfield';

class AssessmentPopupComponent extends Component<Props, State> {
  state = {
    assessment: this.props.assessment || {
      modelElementId: this.props.element.id,
      elementType: this.props.element.type,
      score: 0,
    },
  };

  render() {
    const { element, readonly } = this.props;
    const { assessment } = this.state;
    return (
      <div>
        <Section>
          <Header>Assessment for {element.name}</Header>
          <Divider />
        </Section>
        {readonly ? (
          <div>
            <Header>Score</Header>
            <span>{assessment.score}</span>
            <Header>Feedback</Header>
            <span>{assessment.feedback || '-'}</span>
          </div>
        ) : (
          <Section>
            <Header>Score</Header>
            <TextField value={`${assessment.score}`} onUpdate={this.updateScore} />
            <Header>Feedback</Header>
            <TextField value={`${assessment.feedback || ''}`} onUpdate={this.updateFeedback} />
          </Section>
        )}
      </div>
    );
  }

  private updateScore = (value: string) => {
    const { element, assess } = this.props;
    const score = parseFloat(value) || 0;
    this.setState(
      state => ({
        assessment: {
          ...state.assessment,
          score,
        },
      }),
      () => assess(element.id, this.state.assessment)
    );
  };

  private updateFeedback = (value: string) => {
    const { element, assess } = this.props;
    const feedback = value.length ? value : undefined;
    this.setState(
      state => ({
        assessment: {
          ...state.assessment,
          feedback,
        },
      }),
      () => assess(element.id, this.state.assessment)
    );
  };
}

interface OwnProps {
  element: Element;
}

interface StateProps {
  readonly: boolean;
  assessment?: Assessment;
}

interface DispatchProps {
  assess: typeof AssessmentRepository.assess;
}

type Props = OwnProps & StateProps & DispatchProps;

interface State {
  assessment: Assessment;
}

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state, props) => ({
    readonly: state.editor.readonly,
    assessment: state.assessments[props.element.id],
  }),
  { assess: AssessmentRepository.assess }
);

export const AssessmentPopup = enhance(AssessmentPopupComponent);
