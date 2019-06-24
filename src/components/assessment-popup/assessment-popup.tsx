import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { ModelState } from '../store/model-state';
import { AssessmentSection } from './assessment-section';
import { UMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { Button } from '../controls/button/button';

type OwnProps = { element: UMLElement };
type StateProps = {
  elements: UMLElement[];
  // next: Element | null;
  // getAbsolutePosition: (id: string) => Point;
};
type DispatchProps = {};
type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>((state, props) => ({
  elements: [],//UMLElementRepository.getChildren(state.elements)(props.element.id),
}));
// const enhance = compose<ComponentClass<OwnProps>>(
//   withPopup,
//   connect<StateProps, DispatchProps, OwnProps, ModelState>((state, props) => {
//     const elements = ElementRepository.getChildren(state.elements)(props.element.id);
//     const last = elements.length ? elements[elements.length - 1] : props.element;
//     const index = Object.keys(state.elements).indexOf(last.id) + 1;
//     const next = Object.keys(state.elements)[index % Object.keys(state.elements).length];
//     return {
//       elements,
//       next: ElementRepository.getById(state.elements)(next),
//       getAbsolutePosition: ElementRepository.getAbsolutePosition(state.elements),
//     };
//   }),
// );

class AssessmentPopupComponent extends Component<Props> {
  render() {
    const { elements } = this.props;

    return (
      <div>
        {elements.map((element, i) => (
          <AssessmentSection key={element.id} element={element} />
        ))}
        <section>
          <Button block={true} outline={true} color="primary" onClick={this.next}>
            Next Assessment
          </Button>
        </section>
      </div>
    );
  }

  private next = () => {
    // const { next } = this.props;
    // if (!next) return;

    // let position = { x: 0, y: 0 };
    // if (next instanceof Relationship) {
    //   const { bounds, path } = next;
    //   const targetPoint = path[path.length - 2];
    //   position = {
    //     x: targetPoint.x + bounds.x,
    //     y: targetPoint.y + bounds.y - 20,
    //   };
    // } else {
    //   const { x, y } = this.props.getAbsolutePosition(next.id);
    //   const { width } = next.bounds;
    //   position = { x: x + width, y };
    // }
    // this.props.showPopup(next, position);
  };
}

export const AssessmentPopup = enhance(AssessmentPopupComponent);
