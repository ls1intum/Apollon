import React, { Component, ComponentClass, ComponentType } from 'react';
import { connect } from 'react-redux';
import { IAssessment } from '../../../services/assessment/assessment';
import { IBoundary } from '../../../utils/geometry/boundary';
import { CheckIcon } from '../../controls/icon/check';
import { ExclamationCircleIcon } from '../../controls/icon/exclamation-circle';
import { TimesIcon } from '../../controls/icon/times';
import { ModelState } from '../../store/model-state';
import { UMLElementComponentProps } from '../uml-element-component-props';

type StateProps = {
  assessment?: IAssessment;
  bounds: IBoundary;
};

type DispatchProps = {};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(
  (state, props) => ({
    assessment: state.assessments[props.id],
    bounds: state.elements[props.id].bounds,
  }),
  {},
);

export const assessable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ComponentClass<UMLElementComponentProps> => {
  class Assessable extends Component<Props> {
    render() {
      const { assessment, bounds, ...props } = this.props;

      const count: number = (assessment && Math.min(3, Math.floor(Math.abs(assessment.score)))) || 0;
      const component = assessment && assessment.score > 0 ? <CheckIcon fill="green" /> : <TimesIcon fill="red" />;
      const generator = count > 0 ? [...Array(count)] : [];

      let i = 0;
      let icons: JSX.Element[] = [];
      if (assessment && assessment.score % 1) {
        icons = [
          <g key={0} transform={`translate(0 2)`}>
            {assessment.score > 0 ? <CheckIcon fill="green" /> : <TimesIcon fill="red" />}
          </g>,
        ];
        i += 1;
      } else if (assessment && assessment.score === 0 && assessment.feedback && assessment.feedback.length) {
        icons = [
          <g key={0} transform={`translate(0 2)`}>
            <ExclamationCircleIcon fill="blue" />
          </g>,
        ];
      }

      icons = [
        ...icons,
        ...generator.map(_ => (
          <g key={i + 1} transform={`translate(${i++ * 12} 2)`}>
            {component}
          </g>
        )),
      ];

      return (
        <WrappedComponent {...props}>
          {assessment && <g transform={`translate(${bounds.width - (icons.length + 1) * 12} 8)`}>{icons}</g>}
        </WrappedComponent>
      );
    }
  }

  return enhance(Assessable);
};
