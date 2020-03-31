import React, { Component, ComponentClass, ComponentType } from 'react';
import { UMLElementComponentProps } from '../uml-element-component-props';
import { IAssessment } from '../../../services/assessment/assessment';
import { AssessmentRepository } from '../../../services/assessment/assessment-repository';
import { connect } from 'react-redux';
import { ModelState } from '../../store/model-state';

type OwnProps = {
    element: any
} & UMLElementComponentProps;

type StateProps = {
  readonly: boolean;
  assessment: IAssessment | null;
};
type DispatchProps = { assess: typeof AssessmentRepository.assess };
type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, Props, ModelState>(
  (state, props) => {
    const element = state.elements[props.id];
    return {
      readonly: state.editor.readonly,
      assessment: AssessmentRepository.getById(state.assessments)(element.id),
      element: element,
    };
  },
  { assess: AssessmentRepository.assess },
);

export const droppableAssessment = (WrappedComponent: any): ComponentClass<Props> => {
  class DroppableAssessment extends Component<Props> {
    render() {
      const { assessment, readonly, element } = this.props;

      return (
        <div
          className="artemis-instruction-dropzone"
          onDrop={this.onDrop}
          onDragOver={this.onDragOver}
          onDragEnter={this.onDragEnter}
          onDragLeave={this.onDragLeave}
        >
          <WrappedComponent {...this.props}>{this.props.children}</WrappedComponent>
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

      // const { element, assessment } = this.props;
      const data = ev.dataTransfer.getData('text');
      const instruction = JSON.parse(data);
      const score = instruction.credits;
      const feedback = instruction.feedback;
      // this.props.assess(element.id, { ...assessment, score, feedback });
      console.log(score);
      console.log(feedback);
    };
  }

  return enhance(DroppableAssessment);
};
