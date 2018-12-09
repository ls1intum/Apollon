import { createElement, createRef, RefObject } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import Application from './scenes/Application';
import { State as ReduxState } from './components/Store';
import { Styles } from './components/Theme';
import {
  DiagramType,
  ApollonMode,
  EditorMode,
  ElementSelection,
  InteractiveElementsMode,
} from './domain/Options/types';

export interface ApollonOptions {
  initialState?: Partial<ReduxState>;
  diagramType?: DiagramType;
  mode?: ApollonMode;
  debug?: boolean;
  theme?: Partial<Styles>;
}

class Editor {
  public application: RefObject<Application> = createRef();

  constructor(
    public container: HTMLElement,
    { initialState, theme = {}, ...options }: ApollonOptions
  ) {
    const state: ReduxState = {
      entities: { byId: {}, allIds: [] },
      relationships: { byId: {}, allIds: [] },
      interactiveElements: { allIds: [] },
      editor: { canvasSize: { width: 1600, height: 800 }, gridSize: 10 },
      elements: {},
      ...initialState,
      options: {
        diagramType: DiagramType.ClassDiagram,
        mode: ApollonMode.Full,
        editorMode: EditorMode.ModelingView,
        interactiveMode: InteractiveElementsMode.Highlighted,
        debug: false,
        ...options,
      },
    };

    const app = createElement(Application, {
      ref: this.application,
      state,
      styles: theme,
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
    let i = -1;
    this.application.current &&
      this.application.current.setState(state => {
        const subscribers = state.subscribers.slice();
        i = subscribers.push(callback) - 1;
        return { subscribers };
      });

    return i;
  }

  unsubscribeFromSelectionChange(subscriptionId: number) {
    this.application.current &&
      this.application.current.setState(state => {
        const subscribers = state.subscribers.slice();
        subscribers.splice(subscriptionId);
        return { subscribers };
      });
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
