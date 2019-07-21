import React, { Component, ComponentClass, ComponentType, createRef, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Popups } from '../../packages/popups';
import { UMLElementType } from '../../packages/uml-element-type';
import { ApollonMode } from '../../services/editor/editor-types';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../utils/actions/actions';
import { Assessment } from '../assessment/assessment';
import { CanvasContext } from '../canvas/canvas-context';
import { withCanvas } from '../canvas/with-canvas';
import { Popover, Props as PopoverProps } from '../controls/popover/popover';
import { ModelState } from '../store/model-state';

type OwnProps = {};

type StateProps = {
  element: IUMLElement | null;
  disabled: boolean;
  mode: ApollonMode;
};

type DispatchProps = {
  updateEnd: typeof UMLElementRepository.updateEnd;
  getAbsolutePosition: AsyncDispatch<typeof UMLElementRepository.getAbsolutePosition>;
};

type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

const enhance = compose<ComponentClass<OwnProps>>(
  withCanvas,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({
      element: state.elements[state.updating[0]],
      disabled: !state.editor.enablePopups,
      mode: state.editor.mode,
    }),
    {
      updateEnd: UMLElementRepository.updateEnd,
      getAbsolutePosition: (UMLElementRepository.getAbsolutePosition as any) as AsyncDispatch<
        typeof UMLElementRepository.getAbsolutePosition
      >,
    },
  ),
);

const initialState = Object.freeze({
  position: null as PopoverProps['position'] | null,
  placement: undefined as PopoverProps['placement'],
  alignment: undefined as PopoverProps['alignment'],
});

type State = typeof initialState;

class UnwrappedUpdatePane extends Component<Props, State> {
  state = initialState;

  popover: RefObject<HTMLDivElement> = createRef();

  componentDidUpdate(prevProps: Readonly<Props>) {
    if (!prevProps.element && this.props.element) {
      setTimeout(this.show, 0);
    } else if (prevProps.element && this.props.element && prevProps.element !== this.props.element) {
      this.position();
    }
  }

  render() {
    const { element, disabled, mode } = this.props;
    const { position, alignment, placement } = this.state;

    if (!element || disabled || !position) {
      return null;
    }

    let CustomPopupComponent: ComponentType<{ element: any }> | null = null;
    if (mode === ApollonMode.Assessment) {
      CustomPopupComponent = Assessment;
    } else {
      CustomPopupComponent = Popups[element.type as UMLElementType];
    }
    if (!CustomPopupComponent) {
      return null;
    }

    return createPortal(
      <Popover ref={this.popover} position={position} placement={placement} alignment={alignment}>
        <CustomPopupComponent element={element} />
      </Popover>,
      document.body,
    );
  }

  private show = () => {
    this.position();
    document.addEventListener('pointerdown', this.onPointerDown);

    const { parentElement: canvas } = this.props.canvas.layer;
    if (canvas) {
      canvas.addEventListener('scroll', this.dismiss);
    }
  };

  private dismiss = () => {
    this.setState(initialState);
    document.removeEventListener('pointerdown', this.onPointerDown);

    const { parentElement: canvas } = this.props.canvas.layer;
    if (canvas) {
      canvas.removeEventListener('scroll', this.dismiss);
    }

    if (this.props.element) {
      this.props.updateEnd(this.props.element.id);
    }
  };

  private position = () => {
    const { element } = this.props;
    const { parentElement: canvas } = this.props.canvas.layer;
    if (!element || !canvas) {
      return;
    }

    const absolute = this.props.getAbsolutePosition(element.id);
    const position = this.props.canvas
      .origin()
      .add(absolute)
      .add(window.scrollX, window.scrollY);

    const canvasBounds = canvas.getBoundingClientRect();
    const elementCenter = this.props.canvas
      .origin()
      .add(absolute)
      .add(element.bounds.width / 2, element.bounds.height / 2)
      .subtract(canvasBounds.left, canvasBounds.top);

    const placement = elementCenter.x < canvasBounds.width / 2 ? 'right' : 'left';
    const alignment = elementCenter.y < canvasBounds.height / 2 ? 'start' : 'end';

    if (placement === 'right') {
      position.x += element.bounds.width;
    }
    if (alignment === 'end') {
      position.y += element.bounds.height;
    }

    this.setState({ position, alignment, placement });
  };

  private onPointerDown = (event: PointerEvent) => {
    if (this.popover.current && event.target instanceof HTMLElement && this.popover.current.contains(event.target)) {
      return;
    }

    this.dismiss();
  };
}

export const UpdatePane = enhance(UnwrappedUpdatePane);
