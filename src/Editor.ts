import { createElement, createRef, RefObject } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Store } from 'redux';
import { State as ReduxState } from './components/Store';
import Application from './scenes/Application';
import { Styles } from './components/Theme';
import EditorService, {
  ApollonMode,
  InteractiveElementsMode,
  EditorMode,
} from './services/EditorService';
import * as DiagramLayouter from './rendering/layouters/diagram';
import {
  renderDiagramToSVG,
  RenderOptions,
  RenderedSVG,
} from './rendering/renderers/svg';
import { DiagramType } from './domain/Diagram';
import { ExternalState, Entity, Relationship } from './services/Interface/ExternalState';
import {
  mapInternalToExternalState,
  mapExternalToInternalState,
} from './services/Interface/Interface';

export interface ElementSelection {
  entityIds: string[];
  relationshipIds: string[];
}

export interface ApollonOptions {
  initialState?: ExternalState;
  diagramType: DiagramType;
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
    const state: ReduxState = mapExternalToInternalState(
      initialState,
      options.diagramType,
      EditorMode.ModelingView,
      InteractiveElementsMode.Highlighted,
      options.mode || ApollonMode.Full
    );

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

  getState(): ExternalState | null {
    if (!this.store) return null;

    const state = this.store.getState();
    return mapInternalToExternalState(state);
  }

  destroy() {
    unmountComponentAtNode(this.container);
  }

  static layoutDiagram(
    state: ExternalState,
    layoutOptions: DiagramLayouter.LayoutOptions
  ): DiagramLayouter.LayoutedDiagram {
    const entities: Entity[] = Object.values(state.entities.byId);
    const relationships: Relationship[] = Object.values(state.relationships.byId);

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
