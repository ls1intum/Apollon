import { createElement, createRef, RefObject } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import App from './gui/App';
import { ReduxState } from './gui/redux';
import { Theme } from './gui/theme';
import { DiagramType, ApollonMode, ElementSelection } from './gui/types';

export interface ApollonOptions {
  initialState?: ReduxState | null;
  diagramType?: DiagramType;
  mode?: ApollonMode;
  debug?: boolean;
  theme?: Partial<Theme>;
}

class Editor {
  public application: RefObject<App> = createRef();

  constructor(public container: HTMLElement, options: ApollonOptions) {
    const {
      initialState = null,
      diagramType = DiagramType.ClassDiagram,
      mode = ApollonMode.Full,
      debug = false,
      theme = {},
    } = options;

    const app = createElement(App, {
      ref: this.application,
      initialState,
      diagramType,
      apollonMode: mode,
      debugModeEnabled: debug,
      theme,
    });

    render(app, container);
  }

  getSelection() {
    return this.application.current
      ? this.application.current.state.selection
      : null;
  }

  subscribeToSelectionChange(
    callback: (selection: ElementSelection) => void
  ): number | null {
    return this.application.current
      ? this.application.current.subscribeToSelectionChange(callback)
      : null;
  }

  unsubscribeFromSelectionChange(subscriptionId: number) {
    if (this.application.current !== null) {
      this.application.current.unsubscribeFromSelectionChange(subscriptionId);
    }
  }

  getState() {
    return this.application.current
      ? this.application.current.store.getState()
      : null;
  }

  destroy() {
    unmountComponentAtNode(this.container);
  }
}

export default Editor;
