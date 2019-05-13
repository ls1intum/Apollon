import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Element } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';
import { Relationship } from '../../services/relationship/relationship';
import { Point } from '../../utils/geometry/point';
import { Button } from '../controls/button/button';
import { PopupContext, withPopup } from '../popup/popup-context';
import { ModelState } from '../store/model-state';
import { AssessmentSection } from './assessment-section';

type OwnProps = { element: Element };
type StateProps = {
  elements: Element[];
  next: Element | null;
  getAbsolutePosition: (id: string) => Point;
};
type DispatchProps = {};
type Props = OwnProps & StateProps & DispatchProps & PopupContext;

const enhance = compose<ComponentClass<OwnProps>>(
  withPopup,
  connect<StateProps, DispatchProps, OwnProps, ModelState>((state, props) => {
    const elements = ElementRepository.getChildren(state.elements)(props.element.id);
    const last = elements.length ? elements[elements.length - 1] : props.element;
    const index = Object.keys(state.elements).indexOf(last.id) + 1;
    const next = Object.keys(state.elements)[index % Object.keys(state.elements).length];
    return {
      elements,
      next: ElementRepository.getById(state.elements)(next),
      getAbsolutePosition: ElementRepository.getAbsolutePosition(state.elements),
    };
  }),
);

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
    const { next } = this.props;
    if (!next) return;

    let position = { x: 0, y: 0 };
    if (next instanceof Relationship) {
      const { bounds, path } = next;
      const targetPoint = path[path.length - 2];
      position = {
        x: targetPoint.x + bounds.x,
        y: targetPoint.y + bounds.y - 20,
      };
    } else {
      const { x, y } = this.props.getAbsolutePosition(next.id);
      const { width } = next.bounds;
      position = { x: x + width, y };
    }
    this.props.showPopup(next, position);
  };
}

export const AssessmentPopup = enhance(AssessmentPopupComponent);
