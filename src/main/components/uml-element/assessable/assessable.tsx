import React, { Component, ComponentType } from 'react';
import { connect, ConnectedComponent } from 'react-redux';
import { IAssessment } from '../../../services/assessment/assessment';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { IBoundary } from '../../../utils/geometry/boundary';
import { IPath, Path } from '../../../utils/geometry/path';
import { Point } from '../../../utils/geometry/point';
import { ModelState } from '../../store/model-state';
import { UMLElementComponentProps } from '../uml-element-component-props';
import { Container, CorrectIcon, FeedbackIcon, ICON_SIZE, Triangle, WarningIcon, WrongIcon } from './assessment-styles';
import { findDOMNode } from 'react-dom';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { AssessmentRepository } from '../../../services/assessment/assessment-repository';

type StateProps = {
  assessment?: IAssessment;
  bounds: IBoundary;
  path?: IPath;
  readonly: boolean;
};

type DispatchProps = {
  select: AsyncDispatch<typeof UMLElementRepository.select>;
  deselect: AsyncDispatch<typeof UMLElementRepository.deselect>;
  assess: typeof AssessmentRepository.assess;
  updateStart: AsyncDispatch<typeof UMLElementRepository.updateStart>;
};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(
  (state, props) => {
    const element = state.elements[props.id];

    return {
      assessment: state.assessments[props.id],
      bounds: element.bounds,
      path: UMLRelationship.isUMLRelationship(element) ? element.path : undefined,
      readonly: state.editor.readonly,
    };
  },
  {
    select: UMLElementRepository.select,
    deselect: UMLElementRepository.deselect,
    assess: AssessmentRepository.assess,
    updateStart: UMLElementRepository.updateStart,
  },
);

export const assessable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ConnectedComponent<ComponentType<Props>, UMLElementComponentProps> => {
  class Assessable extends Component<Props> {
    componentDidMount() {
      if (!this.props.readonly) {
        const node = findDOMNode(this) as HTMLElement;
        node.addEventListener('dragover', this.onDragOver.bind(this));
        node.addEventListener('dragleave', this.onDragLeave.bind(this));
        node.addEventListener('drop', this.onDrop.bind(this));
      }
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('dragover', this.onDragOver);
      node.removeEventListener('dragleave', this.onDragLeave);
      node.removeEventListener('drop', this.onDrop);
    }

    render() {
      const { assessment, assess, select, deselect, updateStart, bounds, path: ipath, readonly, ...props } = this.props;

      let position: Point;
      let assessmentWarningPosition: Point;
      if (ipath) {
        const path = new Path(ipath);
        position = path.position(path.length / 2);
        assessmentWarningPosition = path.position(path.length / 2 - ICON_SIZE * 2);
      } else {
        position = new Point(bounds.width, 0);
        assessmentWarningPosition = new Point(position.x - ICON_SIZE * 2, position.y);
      }

      return (
        <WrappedComponent {...props}>
          {assessment && assessment.correctionStatus && assessment.correctionStatus.status === 'INCORRECT' && (
            <g
              transform={`translate(${assessmentWarningPosition.x} ${assessmentWarningPosition.y})`}
              pointerEvents={'none'}
            >
              <>
                <Container />
                <Triangle />
                <WarningIcon />
              </>
            </g>
          )}

          {assessment && (
            <g transform={`translate(${position.x} ${position.y})`} pointerEvents={'none'}>
              {assessment.score === 0 && !!assessment.feedback && (
                <>
                  <Container />
                  <FeedbackIcon />
                </>
              )}
              {assessment.score > 0 && (
                <>
                  <Container />
                  <CorrectIcon />
                </>
              )}
              {assessment.score < 0 && (
                <>
                  <Container />
                  <WrongIcon />
                </>
              )}
            </g>
          )}
        </WrappedComponent>
      );
    }

    // TODO: the following code is Artemis specific and should be refactored
    // TODO: extend the API so that external application can create a Apollon Draggable element
    // TODO: extend the API so that callbacks can be registered which should be called when a draggable element was dropped
    // TODO: the benefit of that would be, that we could remove the artemis specific code from apollon

    private onDragOver = (ev: DragEvent) => {
      // prevent default to allow drop
      ev.preventDefault();
      // don't propagate to parents, so that most accurate element is selected only
      ev.stopPropagation();
      this.props.select(this.props.id);
    };

    private onDragLeave = () => {
      this.props.deselect(this.props.id);
    };

    /**
     * Artemis instruction object can be dropped on assessment sections to automatically fill assessment
     * @param ev DropEvent
     */
    private onDrop = (ev: DragEvent) => {
      // prevent default action (open as link for some elements)
      ev.preventDefault();
      // unselect current element
      this.props.deselect(this.props.id);
      // don't propagate to parents, so that most accurate element is selected only
      ev.stopPropagation();

      if (!!ev.dataTransfer) {
        const data: string = ev.dataTransfer.getData('text/plain');
        if (!data) {
          // tslint:disable-next-line:no-console
          console.warn('Could not get artemis sgi element from drop element');
          return;
        }
        let instruction;
        try {
          instruction = JSON.parse(data);
        } catch (e) {
          // tslint:disable-next-line:no-console
          console.error('Could not parse artemis sgi', e);
          return;
        }
        // TODO: following messages should be received from Artemis
        const removeMessage = 'Do you want to remove the link to the assessment instruction?';
        const tooltipMessage = 'Assessment Instruction: ' + instruction.instructionDescription;
        const feedbackHint =
          'This feedback is associated with the assessment instruction. You can provide additional feedback for this submission element. Student will see combined feedback during the review.';
        const { id: elementId, assessment } = this.props;
        const score = instruction.credits;
        const dropInfo = { instruction, removeMessage, tooltipMessage, feedbackHint };
        this.props.assess(elementId, { ...assessment, score, dropInfo }, 'DROPPED');
        this.props.updateStart(elementId);
      }
    };
  }

  return enhance(Assessable);
};
