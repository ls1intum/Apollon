import { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { UndoRepository } from '../../services/undo/undo-repository';
import { ApollonMode } from '../../typings';
import { ModelState } from '../store/model-state';
import { CanvasContext, withCanvas } from './canvas-context';
import { AsyncDispatch } from '../../utils/actions/actions';

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
        this.props.deselect();
        break;
    }

    if (event.metaKey) {
      switch (event.key) {
        case 'a':
          event.preventDefault();
          this.props.select();
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

type OwnProps = {};

interface StateProps {
  elements: string[];
  selection: string[];
  readonly: boolean;
  mode: ApollonMode;
}

interface DispatchProps {
  duplicate: typeof UMLElementRepository.duplicate;
  move: typeof UMLElementRepository.move;
  delete: typeof UMLElementRepository.deleteSelection;
  undo: typeof UndoRepository.undo;
  redo: typeof UndoRepository.redo;
  select: typeof UMLElementRepository.select;
  deselect: typeof UMLElementRepository.deselect;
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
      move: UMLElementRepository.move,
      delete: UMLElementRepository.deleteSelection,
      undo: UndoRepository.undo,
      redo: UndoRepository.redo,
      select: UMLElementRepository.select,
      deselect: UMLElementRepository.deselect,
    },
  ),
);

export const KeyboardEventListener = enhance(KeyboardEventListenerComponent);
