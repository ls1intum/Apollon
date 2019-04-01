import { createElement, createRef, RefObject } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Store } from 'redux';
import { ModelState } from './components/store/model-state';
import { Application } from './scenes/application';
import { Svg } from './scenes/svg';
import { ApollonOptions, DiagramType, ExportOptions, Selection, SVG, UMLModel } from './typings';

export class ApollonEditor {
  get model(): UMLModel {
    if (!this.store) throw new Error('Apollon was already destroyed.');
    return ModelState.toModel(this.store.getState());
  }

  static exportModelAsSvg(model: UMLModel, options?: ExportOptions): SVG {
    const div = document.createElement('div');
    const element = createElement(Svg, { model, options });
    render(element, div);
    const { innerHTML } = div;
    unmountComponentAtNode(div);
    return {
      svg: innerHTML,
      clip: model.size,
    };
  }

  selection: Selection = { elements: [], relationships: [] };
  private application: RefObject<Application> = createRef();
  private store: Store<ModelState> | null = null;
  private subscribers: Array<(selection: Selection) => void> = [];

  constructor(private container: HTMLElement, options: ApollonOptions) {
    const model: UMLModel = {
      version: '2.0',
      size: { width: 0, height: 0 },
      interactive: { elements: [], relationships: [] },
      elements: [],
      relationships: [],
      assessments: [],
      ...options.model,
      type: options.type || (options.model && options.model.type) || DiagramType.ClassDiagram,
    };
    let state = ModelState.fromModel(model);
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
      state,
      styles: {},
    });
    render(element, container, this.componentDidMount);
  }

  destroy() {
    unmountComponentAtNode(this.container);
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

  private componentDidMount = () => {
    this.store = this.application.current && this.application.current.store.current && this.application.current.store.current.store;
    if (this.store) {
      this.store.subscribe(this.onDispatch);
    }
  };

  private onDispatch = () => {
    if (!this.store) return;
    const { elements } = this.store.getState();
    const selection: Selection = {
      elements: Object.keys(elements).filter(id => elements[id].selected && !('path' in elements[id])),
      relationships: Object.keys(elements).filter(id => elements[id].selected && 'path' in elements[id]),
    };

    if (JSON.stringify(this.selection) === JSON.stringify(selection)) return;

    this.subscribers.forEach(subscriber => subscriber(selection));
    this.selection = selection;
  };
}
