import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { ModelState } from './../Store';
import ElementComponent, { OwnProps } from './ElementComponent';
import { Assessment } from '../../services/assessment';
import { CheckIcon } from './../controls/check-icon';
import { CancelIcon } from './../controls/cancel-icon';

const assessable = (
  WrappedComponent: typeof ElementComponent
): ComponentClass<OwnProps> => {
  class Assessable extends Component<Props> {
    render() {
      const { assessment, element } = this.props;

      const count: number =
        (assessment && Math.min(3, Math.ceil(Math.abs(assessment.score)))) || 0;
      const component =
        assessment && assessment.score > 0 ? (
          <CheckIcon fill="green" />
        ) : (
          <CancelIcon fill="red" />
        );
      const generator = count > 0 ? [...Array(count)] : [];

      const icons = generator.map((_, i) => (
        <g key={i} transform={`translate(${i * 12} 2)`}>
          {component}
        </g>
      ));

      return (
        <WrappedComponent {...this.props}>
          {assessment && (
            <g
              transform={`translate(${element.bounds.width -
                (count + 1) * 12} 0)`}
            >
              {icons}
            </g>
          )}
        </WrappedComponent>
      );
    }
  }

  interface StateProps {
    assessment?: Assessment;
  }

  interface DispatchProps {}

  type Props = OwnProps & StateProps & DispatchProps;

  return connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state, props) => ({ assessment: state.assessments[props.element.id] })
  )(Assessable);
};

export default assessable;
