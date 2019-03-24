import React, { Component } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import Element from '../../domain/Element';
import { Section, Header, Divider, TextField } from './Controls';
import { Assessment } from '../..';
import { AssessmentRepository } from '../../services/assessments';

class AssessmentPopup extends Component<Props, State> {
  state = {
    assessment: this.props.assessment || { score: 0 },
  };

  private onUpdate = (key: 'score' | 'feedback') => (value?: string) => {
    const { element, assess } = this.props;
    if (key === 'feedback' && (!value || !value.length)) value = undefined;
    this.setState(
      state => ({
        assessment: { ...state.assessment, [key]: value },
      }),
      () => assess(element.id, this.state.assessment)
    );
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
            <TextField
              value={`${assessment.score}`}
              onUpdate={this.onUpdate('score')}
            />
            <Header>Feedback</Header>
            <TextField
              value={`${assessment.feedback || ''}`}
              onUpdate={this.onUpdate('feedback')}
            />
          </Section>
        )}
      </div>
    );
  }
}

interface OwnProps {
  element: Element;
}

interface StateProps {
  readonly: boolean;
  assessment: Assessment;
}

interface DispatchProps {
  assess: typeof AssessmentRepository.assess;
}

type Props = OwnProps & StateProps & DispatchProps;

interface State {
  assessment: Assessment;
}

export default connect<StateProps, DispatchProps, OwnProps, ReduxState>(
  (state, props) => ({
    readonly: state.editor.readonly,
    assessment: state.assessments[props.element.id],
  }),
  { assess: AssessmentRepository.assess }
)(AssessmentPopup);
