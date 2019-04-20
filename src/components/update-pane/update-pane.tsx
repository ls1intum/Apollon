import React, { Component, createRef, RefObject } from 'react';
import { connect } from 'react-redux';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { Popover } from '../controls/popover/popover';
import { ModelState } from '../store/model-state';

type OwnProps = {};

type StateProps = {
  element: IUMLElement | null;
};

type DispatchProps = {
  updateEnd: typeof UMLElementRepository.updateEnd;
};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  state => ({
    element: state.elements[state.updating[0]],
  }),
  {
    updateEnd: UMLElementRepository.updateEnd,
  },
);

class UnwrappedUpdatePane extends Component<Props> {
  popover: RefObject<HTMLDivElement> = createRef();

  componentDidUpdate() {
    if (this.props.element) {
      setTimeout(this.listen, 0);
    }
  }

  render() {
    const { element } = this.props;
    if (!element) {
      return null;
    }

    return (
      <Popover ref={this.popover} position={{ x: 0, y: 0 }}>
        Hello
      </Popover>
    );
  }

  private dismiss = () => {
    if (!this.props.element) {
      return;
    }

    this.props.updateEnd(this.props.element.id);
  };

  private listen = () => {
    document.addEventListener('pointerdown', this.onPointerDown, { once: true });
  };

  private onPointerDown = (event: PointerEvent) => {
    if (this.popover.current && event.target instanceof HTMLElement && this.popover.current.contains(event.target)) {
      this.listen();
      return;
    }

    this.dismiss();
  };
}

export const UpdatePane = enhance(UnwrappedUpdatePane);
