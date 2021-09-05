import React, { Component, ComponentClass, ComponentType, createRef, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Popups } from '../../packages/popups';
import { UMLElementType } from '../../packages/uml-element-type';
import { ApollonMode } from '../../services/editor/editor-types';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { UMLRelationship } from '../../services/uml-relationship/uml-relationship';
import { AsyncDispatch } from '../../utils/actions/actions';
import { Path } from '../../utils/geometry/path';
import { Point } from '../../utils/geometry/point';
import { Assessment } from '../assessment/assessment';
import { CanvasContext } from '../canvas/canvas-context';
import { withCanvas } from '../canvas/with-canvas';
import { Popover } from '../controls/popover/popover';
import { ModelState } from '../store/model-state';
import { withRoot } from '../root/with-root';
import { RootContext } from '../root/root-context';

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

type Props = OwnProps & StateProps & DispatchProps & CanvasContext & RootContext;

const enhance = compose<ComponentClass<OwnProps>>(
  withCanvas,
  withRoot,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state) => ({
      element: state.elements[state.updating[0]],
      disabled: !state.editor.enablePopups,
      mode: state.editor.mode,
    }),
    {
      updateEnd: UMLElementRepository.updateEnd,
      getAbsolutePosition: UMLElementRepository.getAbsolutePosition as any as AsyncDispatch<
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

    let CustomPopupComponent: ComponentType<{ element: IUMLElement }> | null;
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
      this.props.root,
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
      const absolute: Point = this.props
        // relative to drawing area (0,0)
        .getAbsolutePosition(element.id)
        .add(
          canvas
            .origin()
            .subtract(this.props.root.getBoundingClientRect().x, this.props.root.getBoundingClientRect().y),
        );

      const elementCenter: Point = absolute.add(element.bounds.width / 2, element.bounds.height / 2);

      const position = absolute;

      // calculate if element is in half or right position of canvas (drawing area) and align popup
      const canvasBounds: ClientRect = container.getBoundingClientRect();
      const placement = elementCenter.x < canvasBounds.width / 2 ? 'right' : 'left';
      const alignment = elementCenter.y < canvasBounds.height / 2 ? 'start' : 'end';

      if (UMLRelationship.isUMLRelationship(element)) {
        const path = new Path(element.path);

        const p = path.position(path.length / 2);
        position.x += p.x;
        position.y += p.y;

        if (alignment === 'start') {
          position.y -= 15;
        }
        if (alignment === 'end') {
          position.y += 15;
        }
      } else {
        if (placement === 'right') {
          // add width to be on right side of element
          position.x += element.bounds.width;
        }
        if (alignment === 'end') {
          // add height to be at the bottom of element
          position.y += element.bounds.height;
        }
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
