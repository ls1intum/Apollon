import { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
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
        this.props.move({ x: 0, y: -10 });
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.props.move({ x: 10, y: 0 });
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.props.move({ x: 0, y: 10 });
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.props.move({ x: -10, y: 0 });
        break;
      case 'Backspace':
      case 'Delete':
        event.preventDefault();
        this.props.delete();
        break;
      case 'Escape':
        event.preventDefault();
        this.props.deselectAll();
        break;
    }

    if (event.metaKey) {
      switch (event.key) {
        case 'a':
          event.preventDefault();
          this.props.selectAll();
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
  duplicate: typeof UMLElementRepository.duplicate;
  move: typeof UMLElementRepository.moveSelection;
  delete: typeof UMLElementRepository.deleteSelection;
  undo: typeof UndoRepository.undo;
  redo: typeof UndoRepository.redo;
  selectAll: typeof UMLElementRepository.selectAll;
  deselectAll: typeof UMLElementRepository.deselectAll;
}

type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

const enhance = compose<ComponentClass<OwnProps>>(
  withCanvas,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({
      elements: Object.keys(state.elements),
      selection: state.selected,
      readonly: state.editor.readonly,
      mode: state.editor.mode,
    }),
    {
      duplicate: UMLElementRepository.duplicate,
      move: UMLElementRepository.moveSelection,
      delete: UMLElementRepository.deleteSelection,
      undo: UndoRepository.undo,
      redo: UndoRepository.redo,
      selectAll: UMLElementRepository.selectAll,
      deselectAll: UMLElementRepository.deselectAll,
    },
  ),
);

export const KeyboardEventListener = enhance(KeyboardEventListenerComponent);
