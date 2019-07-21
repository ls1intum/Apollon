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
import { Point } from '../../utils/geometry/point';
import { Assessment } from '../assessment/assessment';
import { CanvasContext } from '../canvas/canvas-context';
import { withCanvas } from '../canvas/with-canvas';
import { Popover } from '../controls/popover/popover';
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
  position: null as { x: number; y: number } | null,
  placement: undefined as 'top' | 'right' | 'bottom' | 'left' | undefined,
  alignment: undefined as 'start' | 'center' | 'end' | undefined,
});

type State = typeof initialState;

class UnwrappedUpdatePane extends Component<Props, State> {
  state: Readonly<State> = initialState;

  popover: RefObject<HTMLDivElement> = createRef();

  componentDidUpdate(prevProps: Readonly<Props>): void {
    if (!prevProps.element && this.props.element) {
      setTimeout(this.show, 0);
    } else if (prevProps.element && this.props.element && prevProps.element !== this.props.element) {
      this.position(this.props);
    }
  }

  render() {
    const { element, disabled, mode } = this.props;
    const { position, alignment, placement } = this.state;

    if (!element || disabled || !position) {
      return null;
    }

    let CustomPopupComponent: ComponentType<{ element: IUMLElement }> | null = null;
    if (mode === ApollonMode.Assessment) {
      CustomPopupComponent = Assessment;
    } else {
      CustomPopupComponent = Popups[element.type as UMLElementType];
    }
    if (!CustomPopupComponent) {
      return null;
    }

    return createPortal(
      <Popover ref={this.popover} position={position} placement={placement} alignment={alignment} maxHeight={500}>
        <CustomPopupComponent element={element} />
      </Popover>,
      document.body,
    );
  }

  private show = (): void => {
    this.position(this.props);
    document.addEventListener('pointerdown', this.onPointerDown);

    const { parentElement: canvas }: SVGSVGElement = this.props.canvas.layer;
    if (canvas) {
      canvas.addEventListener('scroll', this.onScroll);
    }
  };

  private dismiss = (): void => {
    this.setState(initialState);
    document.removeEventListener('pointerdown', this.onPointerDown);

    const { parentElement: canvas }: SVGSVGElement = this.props.canvas.layer;
    if (canvas) {
      canvas.removeEventListener('scroll', this.onScroll);
    }

    if (this.props.element) {
      this.props.updateEnd(this.props.element.id);
    }
  };

  private position = ({ element, canvas }: Readonly<Props>): void => {
    const container: HTMLElement | null = canvas.layer.parentElement;

    if (element && container) {
      const absolute: Point = this.props.getAbsolutePosition(element.id);

      const canvasBounds: ClientRect = container.getBoundingClientRect();
      const elementCenter: Point = this.props.canvas
        .origin()
        .add(absolute)
        .add(element.bounds.width / 2, element.bounds.height / 2)
        .subtract(canvasBounds.left, canvasBounds.top);

      const position = this.props.canvas
        .origin()
        .add(absolute)
        .add(window.scrollX, window.scrollY);

      const placement = elementCenter.x < canvasBounds.width / 2 ? 'right' : 'left';
      const alignment = elementCenter.y < canvasBounds.height / 2 ? 'start' : 'end';

      if (placement === 'right') {
        position.x += element.bounds.width;
      }
      if (alignment === 'end') {
        position.y += element.bounds.height;
      }

      this.setState({ position, alignment, placement });
    }
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (this.popover.current && event.target instanceof HTMLElement && this.popover.current.contains(event.target)) {
      return;
    }

    this.dismiss();
  };

  private onScroll = (event: Event) => {
    this.dismiss();
  };
}

export const UpdatePane = enhance(UnwrappedUpdatePane);
