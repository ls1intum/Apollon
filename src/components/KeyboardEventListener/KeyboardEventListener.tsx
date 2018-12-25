import React, { Component } from 'react';
import { Store as ReduxStore } from 'redux';
import { connect } from 'react-redux';
import { redo, undo } from './../../services/redux';

class KeyboardEventListener extends Component<Props> {
  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDownEvent);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDownEvent);
  }

  private handleKeyDownEvent = (event: KeyboardEvent) => {
    const actions = this.getActionsForKeyDownEvent(event);

    if (actions.length === 0) {
      return;
    }

    for (const action of actions) {
      if (typeof action === 'function') {
        action();
      } else {
        this.props.dispatch(action);
      }
    }

    event.stopPropagation();
    event.preventDefault();
  };

  private getActionsForKeyDownEvent(e: KeyboardEvent): any[] {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'y':
          return e.shiftKey ? [undo()] : [redo()];

        case 'z':
          return e.shiftKey ? [redo()] : [undo()];
      }
    }

    return [];
  }

  render() {
    return <>{this.props.children}</>;
  }
}

interface DispatchProps {
  dispatch: any;
}

type Props = DispatchProps;

const mapDispatchToProps = (dispatch: any) => ({ dispatch });

export default connect(null, mapDispatchToProps)(KeyboardEventListener);
