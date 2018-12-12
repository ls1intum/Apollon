import { createElement, createRef, RefObject } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Store } from 'redux';
import { State as ReduxState } from './components/Store';
import Application from './scenes/Application';
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
  private application: RefObject<Application> = createRef();

  private store: Store<ReduxState> | null = null;

  constructor(
    public container: HTMLElement,
    { initialState, theme = {}, ...options }: ApollonOptions
  ) {
    const state: ReduxState = {
      entities: { byId: {}, allIds: [] },
      relationships: { byId: {}, allIds: [] },
      interactiveElements: { allIds: [] },
      editor: { canvasSize: { width: 1600, height: 800 }, gridSize: 10 },
      ...initialState,
      elements: initialState && initialState.entities && initialState.entities.byId || {},
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

    render(app, container, this.componentDidMount);
  }

  componentDidMount = () => {
    this.store =
      this.application.current &&
      this.application.current.store.current &&
      this.application.current.store.current.store;
  };

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
    if (!this.store) return;

    const state = this.store.getState();
    return {
      entities: {
        allIds: Object.keys(state.elements).filter(id => state.elements[id].name !== 'Relationship'),
        byId: Object.keys(state.elements).filter(id => state.elements[id].name !== 'Relationship').reduce((o: any, id) => { o[id] = state.elements[id]; return o }, {}),
      },
      relationships: state.relationships,
      interactiveElements: state.interactiveElements,
      editor: state.editor,
      elements: state.elements,
    };
  }

  destroy() {
    unmountComponentAtNode(this.container);
  }
}

export default Editor;
