import React, { Component, ComponentClass, createRef, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Popups } from '../../packages/popups';
import { UMLElementType } from '../../packages/uml-element-type';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { CanvasContext } from '../canvas/canvas-context';
import { withCanvas } from '../canvas/with-canvas';
import { Popover } from '../controls/popover/popover';
import { ModelState } from '../store/model-state';

type OwnProps = {};

type StateProps = {
  element: IUMLElement | null;
};

type DispatchProps = {
  updateEnd: typeof UMLElementRepository.updateEnd;
};

type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

const enhance = compose<ComponentClass<OwnProps>>(
  withCanvas,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({
      element: state.elements[state.updating[0]],
    }),
    {
      updateEnd: UMLElementRepository.updateEnd,
    },
  ),
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

    const position = this.props.canvas.current!.origin().add(element.bounds.x, element.bounds.y);
    const placement = element.bounds.x < 0 ? 'right' : 'left';
    const alignment = element.bounds.y < 0 ? 'start' : 'end';

    if (placement === 'right') {
      position.x += element.bounds.width;
    }
    if (alignment === 'end') {
      position.y += element.bounds.height;
    }

    const CustomPopupComponent = Popups[element.type as UMLElementType];
    if (!CustomPopupComponent) {
      return null;
    }

    return createPortal(
      <Popover
        ref={this.popover}
        position={{ x: position.x, y: position.y }}
        placement={placement}
        alignment={alignment}
      >
        <CustomPopupComponent element={element} />
      </Popover>,
      document.body,
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
