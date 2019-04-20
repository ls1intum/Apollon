import React, { Component } from 'react';
import { createPortal } from 'react-dom';
import { connect } from 'react-redux';
import { Popups } from '../../packages/popups';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ApollonMode } from '../../typings';
import { AssessmentPopup } from '../assessment-popup/assessment-popup';
import { CanvasConsumer } from '../canvas/canvas-context';
import { Popover } from '../controls/popover/popover';
import { ModelState } from '../store/model-state';
import { PopupContext, PopupProvider } from './popup-context';

type OwnProps = {};
type StateProps = {
  mode: ApollonMode;
  readonly: boolean;
  enablePopups: boolean;
};
type DispatchProps = {};
type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  state => ({
    mode: state.editor.mode,
    readonly: state.editor.readonly,
    enablePopups: state.editor.enablePopups,
  }),
  null,
  null,
  { forwardRef: true },
);

interface State {
  element: UMLElement | null;
  position: { x: number; y: number };
}

export class PopupLayerComponent extends Component<Props, State> {
  popup: React.RefObject<HTMLDivElement> = React.createRef();

  state: State = {
    element: null,
    position: { x: 0, y: 0 },
  };

  componentDidMount() {
    document.addEventListener('pointerdown', this.cancel);
  }

  componentWillUnmount() {
    document.removeEventListener('pointerdown', this.cancel);
    window.removeEventListener('resize', this.close);
  }

  render() {
    const context: PopupContext = {
      showPopup: this.showPopup,
      update: this.update,
    };


    return (
      <PopupProvider value={context}>
        {this.props.children}
        <CanvasConsumer
          children={canvasContext => {
            if (!canvasContext || !this.state.element) return null;

            const offset = canvasContext.coordinateSystem.offset(false);
            const position = {
              x: offset.x + window.scrollX + this.state.position.x,
              y: offset.y + window.scrollY + this.state.position.y,
            };

            let CustomPopupComponent = null;

            if (!this.props.enablePopups) return false;
            if (this.props.mode === ApollonMode.Assessment) {
              CustomPopupComponent = AssessmentPopup;
            } else {
              CustomPopupComponent = Popups[this.state.element.type];
              if (!CustomPopupComponent) {
                return null;
              }
            }
            return createPortal(
              <Popover position={position} ref={this.popup} style={{ width: '276px' }}>
                <CustomPopupComponent element={this.state.element} />
              </Popover>,
              document.body,
            );
          }}
        />
      </PopupProvider>
    );
  }

  private showPopup = (element: UMLElement, position: { x: number; y: number }) => {
    this.setState({ element, position });
    window.addEventListener('resize', this.close, { once: true });
  };

  private update = (element: UMLElement) => {
    if (this.state.element && this.state.element.id === element.id) {
      this.setState({ element });
    }
  };

  private cancel = (event: PointerEvent) => {
    if (!this.popup.current) return;
    const popup = this.popup.current as HTMLElement;
    const target = event.target as HTMLElement;
    if (!popup.contains(target)) {
      this.close();
    }
  };

  private close = () => {
    this.setState({ element: null });
  };
}

export const PopupLayer = enhance(PopupLayerComponent);
