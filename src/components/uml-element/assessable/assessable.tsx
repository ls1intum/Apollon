import React, { Component, ComponentClass, ComponentType } from 'react';
import { connect } from 'react-redux';
import { IAssessment } from '../../../services/assessment/assessment';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { IBoundary } from '../../../utils/geometry/boundary';
import { IPath, Path } from '../../../utils/geometry/path';
import { Point } from '../../../utils/geometry/point';
import { ModelState } from '../../store/model-state';
import { UMLElementComponentProps } from '../uml-element-component-props';
import { Container, CorrectIcon, FeedbackIcon, WrongIcon } from './assessment-styles';
import { findDOMNode } from 'react-dom';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { AssessmentRepository } from '../../../services/assessment/assessment-repository';

type StateProps = {
  assessment?: IAssessment;
  bounds: IBoundary;
  path?: IPath;
};

type DispatchProps = {
  select: AsyncDispatch<typeof UMLElementRepository.select>;
  deselect: AsyncDispatch<typeof UMLElementRepository.deselect>;
  assess: typeof AssessmentRepository.assess;
};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(
  (state, props) => {
    const element = state.elements[props.id];

    return {
      assessment: state.assessments[props.id],
      bounds: element.bounds,
      path: UMLRelationship.isUMLRelationship(element) ? element.path : undefined,
    };
  },
  {
    select: UMLElementRepository.select,
    deselect: UMLElementRepository.deselect,
    assess: AssessmentRepository.assess,
  },
);

export const assessable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ComponentClass<UMLElementComponentProps> => {
  class Assessable extends Component<Props> {
    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('dragover', this.onDragOver.bind(this));
      node.addEventListener('dragleave', this.onDragLeave.bind(this));
      node.addEventListener('drop', this.onDrop.bind(this));
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('dragover', this.onDragOver);
      node.removeEventListener('dragleave', this.onDragLeave);
      node.removeEventListener('drop', this.onDrop);
    }

    render() {
      const { assessment, assess, select, deselect, bounds, path: ipath, ...props } = this.props;

      let position: Point;
      if (ipath) {
        const path = new Path(ipath);
        position = path.position(path.length / 2);
      } else {
        position = new Point(bounds.width, 0);
      }

      return (
        <WrappedComponent {...props}>
          {assessment && (
            <g transform={`translate(${position.x} ${position.y})`} pointerEvents={'none'}>
              <Container />
              {assessment.score === 0 && <FeedbackIcon />}
              {assessment.score > 0 && <CorrectIcon />}
              {assessment.score < 0 && <WrongIcon />}
            </g>
          )}
        </WrappedComponent>
      );
    }

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

      const { id: elementId, assessment } = this.props;
      if (!!ev.dataTransfer) {
        const data = ev.dataTransfer.getData('text');
        const instruction = JSON.parse(data);
        const score = instruction.credits;
        const feedback = instruction.feedback;
        this.props.assess(elementId, { ...assessment, score, feedback });
      }
    };
  }

  return enhance(Assessable);
};
