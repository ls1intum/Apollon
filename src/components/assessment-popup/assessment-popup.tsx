import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Element } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';
import { ModelState } from '../store/model-state';
import { AssessmentSection } from './assessment-section';

type OwnProps = { element: Element };
type StateProps = {
  elements: Element[];
};
type DispatchProps = {};
type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>((state, props) => ({
  elements: ElementRepository.getChildren(state.elements)(props.element.id),
}));

class AssessmentPopupComponent extends Component<Props> {
  render() {
    const { elements } = this.props;

    return (
      <div>
        {elements.map(element => (
          <AssessmentSection key={element.id} element={element} />
        ))}
      </div>
    );
  }
}

export const AssessmentPopup = enhance(AssessmentPopupComponent);
