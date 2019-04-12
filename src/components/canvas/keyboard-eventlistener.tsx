import { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ElementRepository } from '../../services/element/element-repository';
import { UndoRepository } from '../../services/undo/undo-repository';
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

    if (event.metaKey) {
      switch (event.key) {
        case 'a':
          event.preventDefault();
          this.props.elements.forEach(id => this.props.select(id, false, true));
          break;
        case 'd':
          event.preventDefault();
          this.props.selection.forEach(child => this.props.duplicate(child));
          break;
        case 'z':
          event.preventDefault();
          event.shiftKey ? this.props.redo() : this.props.undo();
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
  selection: string[];
  readonly: boolean;
  mode: ApollonMode;
}

interface DispatchProps {
  duplicate: typeof ElementRepository.duplicate;
  select: typeof ElementRepository.select;
  move: typeof ElementRepository.move;
  delete: typeof ElementRepository.delete;
  undo: typeof UndoRepository.undo;
  redo: typeof UndoRepository.redo;
}

type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

const enhance = compose<ComponentClass<OwnProps>>(
  withCanvas,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({
      elements: Object.keys(state.elements),
      selection: Object.values(state.elements)
        .filter(element => element.selected)
        .map(element => element.id),
      readonly: state.editor.readonly,
      mode: state.editor.mode,
    }),
    {
      duplicate: ElementRepository.duplicate,
      select: ElementRepository.select,
      move: ElementRepository.move,
      delete: ElementRepository.delete,
      undo: UndoRepository.undo,
      redo: UndoRepository.redo,
    },
  ),
);

export const KeyboardEventListener = enhance(KeyboardEventListenerComponent);
