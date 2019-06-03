import { Component, RefObject } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { ApollonMode } from '../../typings';
import { AsyncDispatch } from '../../utils/actions/actions';
import { CanvasComponent } from '../canvas/canvas';
import { ModelState } from '../store/model-state';

type OwnProps = {
  canvas: RefObject<CanvasComponent>;
};

type StateProps = {
  readonly: boolean;
  mode: ApollonMode;
};

type DispatchProps = {
  //   duplicate: typeof UMLElementRepository.duplicate;
  //   undo: typeof UndoRepository.undo;
  //   redo: typeof UndoRepository.redo;
  select: AsyncDispatch<typeof UMLElementRepository.select>;
  deselect: AsyncDispatch<typeof UMLElementRepository.deselect>;
  startMoving: AsyncDispatch<typeof UMLElementRepository.startMoving>;
  move: AsyncDispatch<typeof UMLElementRepository.move>;
  endMoving: AsyncDispatch<typeof UMLElementRepository.endMoving>;
  delete: AsyncDispatch<typeof UMLElementRepository.delete>;
};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  state => ({
    readonly: state.editor.readonly,
    mode: state.editor.mode,
  }),
  {
    // duplicate: UMLElementRepository.duplicate,
    // undo: UndoRepository.undo,
    // redo: UndoRepository.redo,
    select: UMLElementRepository.select,
    deselect: UMLElementRepository.deselect,
    startMoving: UMLElementRepository.startMoving,
    move: UMLElementRepository.move,
    endMoving: UMLElementRepository.endMoving,
    delete: UMLElementRepository.delete,
  },
);

class KeyboardEventListenerComponent extends Component<Props> {
  componentDidMount() {
    const node = findDOMNode(this.props.canvas.current) as SVGSVGElement;
    node.addEventListener('keydown', this.keyDown);
    node.addEventListener('keyup', this.keyUp);
    node.addEventListener('pointerdown', this.pointerDown);
  }

  componentWillUnmount() {
    const node = findDOMNode(this.props.canvas.current) as SVGSVGElement;
    node.removeEventListener('keydown', this.keyDown);
    node.removeEventListener('keyup', this.keyUp);
    node.removeEventListener('pointerdown', this.pointerDown);
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
    if (this.props.readonly || this.props.mode === ApollonMode.Assessment) {
      return;
    }

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
    if (event.metaKey) {
      switch (event.key) {
        case 'a':
          event.preventDefault();
          this.props.select();
          break;
        //         case 'd':
        //           event.preventDefault();
        //           this.props.selection.forEach(child => this.props.duplicate(child));
        //           break;
        //         case 'z':
        //           event.preventDefault();
        //           event.shiftKey ? this.props.redo() : this.props.undo();
        //           break;
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
