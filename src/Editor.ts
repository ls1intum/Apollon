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
  InteractiveElementsMode,
} from './services/EditorService';
import { ElementSelection } from './components/SelectionListener/types';
import { Relationship } from './core/domain';
import { ElementState } from './domain/Element';
import { EditorState } from './services/EditorService';
import Element from './domain/Element';

interface ExternalState {
  entities: {
    byId: { [id: string]: Element };
    allIds: string[];
  };
  relationships: {
    byId: { [id: string]: Relationship };
    allIds: string[];
  };
  interactiveElements: {
    allIds: string[];
  };
  editor: {
    canvasSize: { width: number; height: number };
    gridSize: number;
  };
  elements: ElementState;
}

export interface ApollonOptions {
  initialState?: Partial<ExternalState>;
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
    const { entities = { byId: {} }, editor = {}, ...rest } = initialState || {};
    const editorState: EditorState = {
      gridSize: 10,
      canvasSize: { width: 1600, height: 800 },
      diagramType: DiagramType.ClassDiagram,
      mode: ApollonMode.Full,
      editorMode: EditorMode.ModelingView,
      interactiveMode: InteractiveElementsMode.Highlighted,
      debug: false,
      ...options,
      ...editor,
    };
    const state: Partial<ReduxState> = {
      relationships: { byId: {}, allIds: [] },
      interactiveElements: { allIds: [] },
      editor: editorState,
      ...rest,
      elements: entities.byId,
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
        allIds: Object.keys(state.elements).filter(
          id => state.elements[id].name !== 'Relationship'
        ),
        byId: Object.keys(state.elements)
          .filter(id => state.elements[id].name !== 'Relationship')
          .reduce((o: any, id) => {
            o[id] = state.elements[id];
            return o;
          }, {}),
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
