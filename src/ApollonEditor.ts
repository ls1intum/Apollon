import { createElement, RefObject, createRef } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Store } from 'redux';
import { Application } from './scenes/Application';
import { Svg } from './scenes/Svg';
import { State } from './components/Store';
import { DiagramType } from './domain/Diagram';
import { ApollonOptions, Selection, UMLModel, ExportOptions, SVG } from '.';

export class ApollonEditor {
  private application: RefObject<Application> = createRef();
  private store: Store<State> | null = null;
  private subscribers: Array<(selection: Selection) => void> = [];

  selection: Selection = { elements: [], relationships: [] };

  constructor(private container: HTMLElement, options: ApollonOptions) {
    const model: UMLModel = {
      version: '2.0',
      size: { width: 0, height: 0 },
      interactive: { elements: [], relationships: [] },
      elements: {},
      relationships: {},
      assessments: {},
      ...options.model,
      type:
        options.type ||
        (options.model && options.model.type) ||
        DiagramType.ClassDiagram,
    };
    let state = State.fromModel(model);
    state = {
      ...state,
      editor: {
        ...state.editor,
        ...(options.mode && { mode: options.mode }),
        ...(options.readonly && { readonly: options.readonly }),
      },
    };

    const element = createElement(Application, {
      ref: this.application,
      state: state,
      styles: {},
    });
    render(element, container, this.componentDidMount);
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
    const selection: Selection = {
      elements: Object.keys(elements).filter(
        id => elements[id].selected && elements[id].base !== 'Relationship'
      ),
      relationships: Object.keys(elements).filter(
        id => elements[id].selected && elements[id].base === 'Relationship'
      ),
    };

    if (JSON.stringify(this.selection) === JSON.stringify(selection)) return;

    this.subscribers.forEach(subscriber => subscriber(selection));
    this.selection = selection;
  };

  destroy() {
    unmountComponentAtNode(this.container);
  }

  get model(): UMLModel {
    if (!this.store) throw new Error('Apollon was already destroyed.');
    return State.toModel(this.store.getState());
  }

  subscribeToSelectionChange(callback: (selection: Selection) => void): number {
    return this.subscribers.push(callback) - 1;
  }

  unsubscribeFromSelectionChange(subscriptionId: number) {
    this.subscribers.splice(subscriptionId);
  }

  exportAsSVG(options?: ExportOptions): SVG {
    return ApollonEditor.exportModelAsSvg(this.model, options);
  }

  static exportModelAsSvg(model: UMLModel, options?: ExportOptions): SVG {
    const div = document.createElement('div');
    const element = createElement(Svg, {
      state: State.fromModel(model),
      options,
    });
    render(element, div);
    const { innerHTML } = div;
    unmountComponentAtNode(div);
    console.log(innerHTML);
    return {
      svg: innerHTML,
      size: { width: 0, height: 0 },
    };
  }
}
