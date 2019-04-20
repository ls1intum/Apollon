import React, { Component } from 'react';
import { connect } from 'react-redux';
import { UMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { ModelState } from '../store/model-state';
import { AssessmentSection } from './assessment-section';

type OwnProps = { element: UMLElement };
type StateProps = {
  elements: UMLElement[];
};
type DispatchProps = {};
type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>((state, props) => ({
  elements: UMLElementRepository.getChildren(state.elements)(props.element.id),
}));

class AssessmentPopupComponent extends Component<Props> {
  render() {
    const { elements } = this.props;

    return (
      <div>
        {elements.map((element, i) => (
          <AssessmentSection key={element.id} element={element} last={i === elements.length - 1} />
        ))}
      </div>
    );
  }
}

export const AssessmentPopup = enhance(AssessmentPopupComponent);
