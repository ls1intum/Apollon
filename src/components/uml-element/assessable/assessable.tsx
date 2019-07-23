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

type StateProps = {
  assessment?: IAssessment;
  bounds: IBoundary;
  path?: IPath;
};

type DispatchProps = {};

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
  {},
);

export const assessable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ComponentClass<UMLElementComponentProps> => {
  class Assessable extends Component<Props> {
    render() {
      const { assessment, bounds, path: ipath, ...props } = this.props;

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
            <g transform={`translate(${position.x} ${position.y})`}>
              <Container />
              {assessment.score === 0 && <FeedbackIcon />}
              {assessment.score > 0 && <CorrectIcon />}
              {assessment.score < 0 && <WrongIcon />}
            </g>
          )}
        </WrappedComponent>
      );
    }
  }

  return enhance(Assessable);
};
