import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { IAssessment } from '../../services/assessment/assessment';
import { CheckIcon } from '../controls/icon/check';
import { TimesIcon } from '../controls/icon/times';
import { ModelState } from '../store/model-state';
import { ElementComponent, OwnProps } from './element-component';

export const assessable = (WrappedComponent: typeof ElementComponent): ComponentClass<OwnProps> => {
  class Assessable extends Component<Props> {
    render() {
      const { assessment } = this.props;

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
        <WrappedComponent {...this.props}>
          {/* {assessment && <g transform={`translate(${element.bounds.width - (icons.length + 1) * 12} 0)`}>{icons}</g>} */}
        </WrappedComponent>
      );
    }
  }

  type StateProps = {
    assessment?: IAssessment;
  };

  type DispatchProps = {};

  type Props = OwnProps & StateProps & DispatchProps;

  return connect<StateProps, DispatchProps, OwnProps, ModelState>((state, props) => ({ assessment: state.assessments[props.id] }))(
    Assessable,
  );
};
