import { createElement, createRef, RefObject } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Store } from 'redux';
import { ModelState } from './components/store/model-state';
import { Application } from './scenes/application';
import { Svg } from './scenes/svg';
import { ApollonOptions, Assessment, DiagramType, ExportOptions, Selection, SVG, UMLModel } from './typings';

export class ApollonEditor {
  get model(): UMLModel {
    if (!this.store) throw new Error('Apollon was already destroyed.');
    return ModelState.toModel(this.store.getState());
  }

  static exportModelAsSvg(model: UMLModel, options?: ExportOptions): SVG {
    const div = document.createElement('div');
    const element = createElement(Svg, { model, options });
    const svg = render(element, div);
    const { innerHTML } = div;
    unmountComponentAtNode(div);
    return {
      svg: innerHTML,
      clip: svg.state.bounds,
    };
  }

  selection: Selection = { elements: [], relationships: [] };
  private assessments: Assessment[] = [];
  private application: RefObject<Application> = createRef();
  private store: Store<ModelState> | null = null;
  private selectionSubscribers: Array<(selection: Selection) => void> = [];
  private assessmentSubscribers: Array<(assessments: Assessment[]) => void> = [];

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
    return this.selectionSubscribers.push(callback) - 1;
  }

  unsubscribeFromSelectionChange(subscriptionId: number) {
    this.selectionSubscribers.splice(subscriptionId);
  }

  subscribeToAssessmentChange(callback: (assessments: Assessment[]) => void): number {
    return this.assessmentSubscribers.push(callback) - 1;
  }

  unsubscribeFromAssessmentChange(subscriptionId: number) {
    this.assessmentSubscribers.splice(subscriptionId);
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
    const { elements, assessments } = this.store.getState();
    const selection: Selection = {
      elements: Object.keys(elements).filter(id => elements[id].selected && !('path' in elements[id])),
      relationships: Object.keys(elements).filter(id => elements[id].selected && 'path' in elements[id]),
    };

    if (JSON.stringify(this.selection) !== JSON.stringify(selection)) {
      this.selectionSubscribers.forEach(subscriber => subscriber(selection));
      this.selection = selection;
    }

    const umlAssessments = Object.keys(assessments).map<Assessment>(id => ({
      modelElementId: id,
      elementType: elements[id].type,
      score: assessments[id].score,
      feedback: assessments[id].feedback,
    }));

    if (JSON.stringify(this.assessments) !== JSON.stringify(umlAssessments)) {
      this.assessmentSubscribers.forEach(subscriber => subscriber(umlAssessments));
      this.assessments = umlAssessments;
    }
  };
}
