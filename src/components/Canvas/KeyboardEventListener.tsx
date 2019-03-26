import { Component, ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { ModelState } from './../Store';
import CanvasContext, { withCanvas } from './CanvasContext';
import { ElementRepository } from '../../services/element';
import PopupLayer from '../Popup';

class KeyboardEventListener extends Component<Props> {
  private eventListener = (event: KeyboardEvent) => {
    if (this.props.readonly) return;

    if (this.props.popup.current && this.props.popup.current.state.element)
      return;

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
    }
  };

  componentDidMount() {
    this.props.canvas.addEventListener('keydown', this.eventListener);
  }

  componentWillUnmount() {
    this.props.canvas.removeEventListener('keydown', this.eventListener);
  }

  render() {
    return null;
  }
}

interface OwnProps {
  popup: React.RefObject<PopupLayer>;
}

interface StateProps {
  readonly: boolean;
}

interface DispatchProps {
  move: typeof ElementRepository.move;
  delete: typeof ElementRepository.delete;
}

type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

export default compose<ComponentClass<OwnProps>>(
  withCanvas,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({ readonly: state.editor.readonly }),
    {
      move: ElementRepository.move,
      delete: ElementRepository.delete,
    }
  )
)(KeyboardEventListener);
