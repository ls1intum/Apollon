import { createElement, createRef, RefObject } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Store } from 'redux';
import { State as ReduxState } from './components/Store';
import Application from './scenes/Application';
import { Styles } from './components/Theme';
import EditorService, {
  DiagramType,
  ApollonMode,
} from './services/EditorService';
import { Relationship } from './core/domain';
import { ElementState, ElementRepository } from './domain/Element';
import Element from './domain/Element';
import { getAllRelationships } from './gui/redux';
import * as DiagramLayouter from './rendering/layouters/diagram';
import { renderDiagramToSVG, RenderOptions, RenderedSVG } from './rendering/renderers/svg';

export interface ElementSelection {
  entityIds: string[];
  relationshipIds: string[];
}

interface ExternalState {
  entities: {
    byId: ElementState;
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
  theme?: Partial<Styles>;
}

class Editor {
  private application: RefObject<Application> = createRef();

  private store: Store<ReduxState> | null = null;
  private selection: ElementSelection = { entityIds: [], relationshipIds: [] };
  private subscribers: Array<(selection: ElementSelection) => void> = [];

  constructor(
    public container: HTMLElement,
    { initialState, theme = {}, ...options }: ApollonOptions
  ) {
    const { entities = { byId: {} }, editor = {}, ...rest } =
      initialState || {};
    const state: Partial<ReduxState> = {
      relationships: { byId: {}, allIds: [] },
      interactiveElements: { allIds: [] },
      editor: {
        ...EditorService.initialState,
        ...editor,
        ...options,
      },
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

  private componentDidMount = () => {
    this.store =
      this.application.current &&
      this.application.current.store.current &&
      this.application.current.store.current.store;
    this.store && this.store.subscribe(this.onDispatch);
  };

  private onDispatch = () => {
    if (!this.store) return;
    const { elements } = this.store.getState();
    const selection: ElementSelection = {
      entityIds: Object.keys(elements).filter(
        id => elements[id].selected && elements[id].name !== 'Relationship'
      ),
      relationshipIds: Object.keys(elements).filter(
        id => elements[id].selected && elements[id].name === 'Relationship'
      ),
    };

    if (JSON.stringify(this.selection) === JSON.stringify(selection)) return;

    this.subscribers.forEach(subscriber => subscriber(selection));
    this.selection = selection;
  };

  getSelection(): ElementSelection {
    return this.selection;
  }

  subscribeToSelectionChange(
    callback: (selection: ElementSelection) => void
  ): number {
    return this.subscribers.push(callback) - 1;
  }

  unsubscribeFromSelectionChange(subscriptionId: number) {
    this.subscribers.splice(subscriptionId);
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
      elements: state.elements,
    };
  }

  destroy() {
    unmountComponentAtNode(this.container);
  }

  static layoutDiagram(
    state: ReduxState,
    layoutOptions: DiagramLayouter.LayoutOptions
  ) {
    const entities = ElementRepository.read(state);
    const relationships = getAllRelationships(state);

    return DiagramLayouter.layoutDiagram(
      { entities, relationships },
      layoutOptions
    );
  }

  static renderDiagramToSVG(
    layoutedDiagram: DiagramLayouter.LayoutedDiagram,
    renderOptions: RenderOptions
  ): RenderedSVG {
    return renderDiagramToSVG(layoutedDiagram, renderOptions);
  }
}

export default Editor;
