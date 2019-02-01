import React, { Component } from 'react';
import PopupContext, { PopupProvider } from './PopupContext';
import Popup from './Popup';
import Element from '../../domain/Element';
import { LayoutedRelationship } from '../../domain/Relationship';
import RelationshipPopup from './RelationshipPopup';

class PopupLayer extends Component<{}, State> {
  popup: React.RefObject<HTMLDivElement> = React.createRef();

  state: State = {
    element: null,
    relationship: null,
  };

  private showPopup = (element: Element) => {
    this.setState({ element });
  };

  private showRelationshipPopup = (relationship: LayoutedRelationship) => {
    this.setState({ relationship });
  };

  private update = (element: Element) => {
    if (this.state.element && this.state.element.id === element.id) {
      this.setState({ element });
    }
  };

  private updateRelationship = (relationship: LayoutedRelationship) => {
    if (
      this.state.relationship &&
      this.state.relationship.relationship.id === relationship.relationship.id
    ) {
      this.setState({ relationship });
    }
  };

  private cancel = (event: MouseEvent) => {
    if (!this.popup.current) return;
    const popup = this.popup.current as HTMLElement;
    const target = event.target as HTMLElement;
    if (!popup.contains(target)) {
      this.setState({ element: null, relationship: null });
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
      showRelationshipPopup: this.showRelationshipPopup,
      update: this.update,
      updateRelationship: this.updateRelationship,
    };
    return (
      <PopupProvider value={context}>
        {this.props.children}
        {this.state.element && (
          <div ref={this.popup}>
            <Popup element={this.state.element} />
          </div>
        )}
        {this.state.relationship && (
          <div ref={this.popup}>
            <RelationshipPopup element={this.state.relationship} />
          </div>
        )}
      </PopupProvider>
    );
  }
}

interface State {
  element: Element | null;
  relationship: LayoutedRelationship | null;
}

export default PopupLayer;
