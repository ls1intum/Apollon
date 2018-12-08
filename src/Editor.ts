import { createElement, createRef, RefObject } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import Application from './scenes/Application';
import { State as ReduxState } from './components/Store';
import { Styles } from './components/Theme';
import { DiagramType, ApollonMode, ElementSelection } from './gui/types';

export interface ApollonOptions {
  initialState?: ReduxState;
  diagramType?: DiagramType;
  mode?: ApollonMode;
  debug?: boolean;
  theme?: Partial<Styles>;
}

class Editor {
  public application: RefObject<Application> = createRef();

  constructor(public container: HTMLElement, options: ApollonOptions) {
    const {
      initialState,
      diagramType = DiagramType.ClassDiagram,
      mode = ApollonMode.Full,
      debug = false,
      theme = {},
    } = options;

    const app = createElement(Application, {
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
    return (
      this.application.current &&
      this.application.current.store.current &&
      this.application.current.store.current.store.getState()
    );
  }

  destroy() {
    unmountComponentAtNode(this.container);
  }
}

export default Editor;
