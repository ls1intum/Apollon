import 'pepjs';
import { createElement, createRef, RefObject } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { DeepPartial, Store } from 'redux';
import { ModelState } from './components/store/model-state';
import { Styles } from './components/theme/styles';
import { RelationshipType } from './packages/relationship-type';
import { UMLElementType } from './packages/uml-element-type';
import { Application } from './scenes/application';
import { Svg } from './scenes/svg';
import { ApollonView } from './services/editor/editor-types';
import { UMLDiagram } from './services/uml-diagram/uml-diagram';
import { UMLElementRepository } from './services/uml-element/uml-element-repository';
import { ApollonMode, ApollonOptions, Assessment, ExportOptions, Locale, Selection, SVG, UMLModel } from './typings';

export class ApollonEditor {
  get model(): UMLModel {
    if (!this.store) throw new Error('Apollon was already destroyed.');
    return ModelState.toModel(this.store.getState());
  }

  set model(model: UMLModel) {
    if (!this.store) throw new Error('Apollon was already destroyed.');
    const state: DeepPartial<ModelState> = {
      ...ModelState.fromModel(model),
      editor: { ...this.store.getState().editor },
    };
    this.destroy();

    const element = createElement(Application, {
      ref: this.application,
      state,
      styles: this.options.theme,
      locale: this.options.locale,
    });
    render(element, this.container, this.componentDidMount);
  }

  set locale(locale: Locale) {
    if (!this.store) throw new Error('Apollon was already destroyed.');
    this.destroy();

    const element = createElement(Application, {
      ref: this.application,
      state: this.store.getState(),
      styles: this.options.theme,
      locale,
    });
    render(element, this.container, this.componentDidMount);
  }

  static exportModelAsSvg(model: UMLModel, options?: ExportOptions, theme?: DeepPartial<Styles>): SVG {
    const div = document.createElement('div');
    const element = createElement(Svg, { model, options, styles: theme });
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

  constructor(private container: HTMLElement, private options: ApollonOptions) {
    let state: DeepPartial<ModelState> | undefined = options.model ? ModelState.fromModel(options.model) : {};

    state = {
      ...state,
      diagram: new UMLDiagram({ ...state.diagram, type: options.type, bounds: { ...(options.model && options.model.size) } }),
      editor: {
        ...state.editor,
        view: ApollonView.Modelling,
        mode: options.mode || ApollonMode.Exporting,
        readonly: options.readonly || false,
        enablePopups: options.enablePopups || true,
      },
    };

    const element = createElement(Application, {
      ref: this.application,
      state,
      styles: options.theme,
      locale: options.locale,
    });
    render(element, container, this.componentDidMount);
  }

  destroy() {
    unmountComponentAtNode(this.container);
  }

  select(selection: Selection) {
    if (!this.store) return;
    const dispatch = this.store.dispatch;
    dispatch(UMLElementRepository.deselect());
    dispatch(UMLElementRepository.select([...selection.elements, ...selection.relationships]));
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
    return ApollonEditor.exportModelAsSvg(this.model, options, this.options.theme);
  }

  private componentDidMount = () => {
    this.container.setAttribute('touch-action', 'none');

    this.store =
      this.application.current &&
      this.application.current.store.current &&
      this.application.current.store.current.state.store;
    if (this.store) {
      this.store.subscribe(this.onDispatch);
    }
  };

  private onDispatch = () => {
    if (!this.store) return;
    const { elements, selected, assessments } = this.store.getState();
    const selection: Selection = {
      elements: selected.filter(id => elements[id].type in UMLElementType),
      relationships: selected.filter(id => elements[id].type in RelationshipType),
    };

    if (JSON.stringify(this.selection) !== JSON.stringify(selection)) {
      this.selectionSubscribers.forEach(subscriber => subscriber(selection));
      this.selection = selection;
    }

    const umlAssessments = Object.keys(assessments).map<Assessment>(id => ({
      modelElementId: id,
      elementType: elements[id].type as UMLElementType | RelationshipType,
      score: assessments[id].score,
      feedback: assessments[id].feedback,
    }));

    if (JSON.stringify(this.assessments) !== JSON.stringify(umlAssessments)) {
      this.assessmentSubscribers.forEach(subscriber => subscriber(umlAssessments));
      this.assessments = umlAssessments;
    }
  };
}
