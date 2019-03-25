import React, { Component } from 'react';
import PopupContext, { PopupProvider } from './PopupContext';
import Popup from './Popup';
import { Element } from '../../domain/Element';

class PopupLayer extends Component<{}, State> {
  popup: React.RefObject<HTMLDivElement> = React.createRef();

  state: State = {
    element: null,
    position: { x: 0, y: 0 },
  };

  private showPopup = (element: Element, position: { x: number; y: number }) => {
    this.setState({ element, position });
  };

  private update = (element: Element) => {
    if (this.state.element && this.state.element.id === element.id) {
      this.setState({ element });
    }
  };

  private cancel = (event: MouseEvent) => {
    if (!this.popup.current) return;
    const popup = this.popup.current as HTMLElement;
    const target = event.target as HTMLElement;
    if (!popup.contains(target)) {
      this.setState({ element: null });
    }
  };

  componentDidMount() {
    document.addEventListener('mousedown', this.cancel);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.cancel);
  }

  render() {
    const context: PopupContext = {
      showPopup: this.showPopup,
      update: this.update,
    };
    return (
      <PopupProvider value={context}>
        {this.props.children}
        {this.state.element && (
          <div ref={this.popup}>
            <Popup element={this.state.element} position={this.state.position} />
          </div>
        )}
      </PopupProvider>
    );
  }
}

interface State {
  element: Element | null;
  position: { x: number; y: number };
}

export default PopupLayer;
