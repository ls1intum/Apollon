import { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ElementRepository } from '../../services/element/element-repository';
import { ApollonMode } from '../../typings';
import { PopupLayerComponent } from '../popup/popup-layer';
import { ModelState } from '../store/model-state';
import { CanvasContext, withCanvas } from './canvas-context';

class KeyboardEventListenerComponent extends Component<Props> {
  componentDidMount() {
    this.props.canvas.addEventListener('keydown', this.eventListener);
  }

  componentWillUnmount() {
    this.props.canvas.removeEventListener('keydown', this.eventListener);
  }

  render() {
    return null;
  }
  private eventListener = (event: KeyboardEvent) => {
    if (this.props.readonly || this.props.mode === ApollonMode.Assessment) return;

    if (this.props.popup.current && this.props.popup.current.state.element) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.props.move(null, { x: 0, y: -10 });
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.props.move(null, { x: 10, y: 0 });
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.props.move(null, { x: 0, y: 10 });
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.props.move(null, { x: -10, y: 0 });
        break;
      case 'Backspace':
      case 'Delete':
        event.preventDefault();
        this.props.delete(null);
        break;
      case 'Escape':
        event.preventDefault();
        this.props.select(null);
        break;
    }

    if (event.ctrlKey) {
      switch (event.key) {
        case 'a':
          event.preventDefault();
          this.props.elements.forEach(id => this.props.select(id, false, true));
          break;
      }
    }
  };
}

interface OwnProps {
  popup: React.RefObject<PopupLayerComponent>;
}

interface StateProps {
  elements: string[];
  readonly: boolean;
  mode: ApollonMode;
}

interface DispatchProps {
  select: typeof ElementRepository.select;
  move: typeof ElementRepository.move;
  delete: typeof ElementRepository.delete;
}

type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

const enhance = compose<ComponentClass<OwnProps>>(
  withCanvas,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({ elements: Object.keys(state.elements), readonly: state.editor.readonly, mode: state.editor.mode }),
    {
      select: ElementRepository.select,
      move: ElementRepository.move,
      delete: ElementRepository.delete,
    },
  ),
);

export const KeyboardEventListener = enhance(KeyboardEventListenerComponent);
