import { Component, ComponentType } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { CopyRepository } from '../../services/copypaste/copy-repository';
import { ApollonMode } from '../../services/editor/editor-types';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { UndoRepository } from '../../services/undo/undo-repository';
import { AsyncDispatch } from '../../utils/actions/actions';
import { ModelState } from '../store/model-state';
import { CanvasContext } from './canvas-context';
import { withCanvas } from './with-canvas';

type OwnProps = {};

type StateProps = {
  readonly: boolean;
  mode: ApollonMode;
};

type DispatchProps = {
  undo: typeof UndoRepository.undo;
  redo: typeof UndoRepository.redo;
  copy: typeof CopyRepository.copy;
  paste: typeof CopyRepository.paste;
  select: AsyncDispatch<typeof UMLElementRepository.select>;
  deselect: AsyncDispatch<typeof UMLElementRepository.deselect>;
  startMoving: AsyncDispatch<typeof UMLElementRepository.startMoving>;
  move: AsyncDispatch<typeof UMLElementRepository.move>;
  endMoving: AsyncDispatch<typeof UMLElementRepository.endMoving>;
  delete: AsyncDispatch<typeof UMLElementRepository.delete>;
};

type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

const enhance = compose<ComponentType<OwnProps>>(
  withCanvas,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state) => ({
      readonly: state.editor.readonly,
      mode: state.editor.mode,
    }),
    {
      undo: UndoRepository.undo,
      redo: UndoRepository.redo,
      copy: CopyRepository.copy,
      paste: CopyRepository.paste,
      select: UMLElementRepository.select,
      deselect: UMLElementRepository.deselect,
      startMoving: UMLElementRepository.startMoving,
      move: UMLElementRepository.move,
      endMoving: UMLElementRepository.endMoving,
      delete: UMLElementRepository.delete,
    },
  ),
);

class KeyboardEventListenerComponent extends Component<Props> {
  componentDidMount() {
    const { layer } = this.props.canvas;
    if (!this.props.readonly && this.props.mode !== ApollonMode.Assessment) {
      layer.addEventListener('keydown', this.keyDown);
      layer.addEventListener('keyup', this.keyUp);
    }
    layer.addEventListener('pointerdown', this.pointerDown);
  }

  render() {
    return null;
  }

  private pointerDown = (event: PointerEvent) => {
    if (event.target !== event.currentTarget || event.shiftKey) {
      return;
    }
    this.props.deselect();
  };

  private keyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (!event.repeat) {
          this.props.startMoving();
        }
        this.props.move({ x: 0, y: -10 });
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (!event.repeat) {
          this.props.startMoving();
        }
        this.props.move({ x: 10, y: 0 });
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!event.repeat) {
          this.props.startMoving();
        }
        this.props.move({ x: 0, y: 10 });
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (!event.repeat) {
          this.props.startMoving();
        }
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
    if (event.metaKey || event.ctrlKey) {
      switch (event.key) {
        case 'a':
          event.preventDefault();
          this.props.select();
          break;
        case 'c':
          event.preventDefault();
          this.props.copy();
          break;
        case 'v':
          event.preventDefault();
          this.props.paste();
          break;
        case 'z':
          event.preventDefault();
          event.shiftKey ? this.props.redo() : this.props.undo();
          break;
      }
    }
  };

  private keyUp = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
      case 'ArrowDown':
      case 'ArrowLeft':
        this.props.endMoving(undefined, true);
        break;
    }
  };
}

export const KeyboardEventListener = enhance(KeyboardEventListenerComponent);
