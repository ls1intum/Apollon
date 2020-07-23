import 'pepjs';
import { createElement, createRef, RefObject } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { DeepPartial, Store } from 'redux';
import { ModelState } from './components/store/model-state';
import { Styles } from './components/theme/styles';
import { UMLElementType } from './packages/uml-element-type';
import { UMLRelationshipType } from './packages/uml-relationship-type';
import { Application } from './scenes/application';
import { Svg } from './scenes/svg';
import { Actions } from './services/actions';
import { ApollonMode, ApollonView, Locale } from './services/editor/editor-types';
import { UMLDiagram } from './services/uml-diagram/uml-diagram';
import { UMLElementRepository } from './services/uml-element/uml-element-repository';
import * as Apollon from './typings';
import { Dispatch } from './utils/actions/actions';
import { UMLDiagramType, UMLModel } from './typings';
import { debounce } from './utils/debounce';
import { ErrorBoundary } from './components/controls/error-boundary/ErrorBoundary';
import { uuid } from './utils/uuid';

export class ApollonEditor {
  get model(): Apollon.UMLModel {
    if (!this.store) throw new Error('Apollon was already destroyed.');
    return ModelState.toModel(this.store.getState());
  }

  set model(model: Apollon.UMLModel) {
    if (!this.store) throw new Error('Apollon was already destroyed.');
    const state: DeepPartial<ModelState> = {
      ...ModelState.fromModel(model),
      editor: { ...this.store.getState().editor },
    };
    this.recreateEditor(state);
  }

  set type(diagramType: UMLDiagramType) {
    if (!this.store) throw new Error('Apollon was already destroyed.');
    const state: DeepPartial<ModelState> = {
      ...this.store.getState(),
      diagram: new UMLDiagram({
        type: diagramType,
      }),
      elements: undefined,
    };
    this.recreateEditor(state);
  }

  set locale(locale: Locale) {
    if (!this.store) throw new Error('Apollon was already destroyed.');
    const state = this.store.getState();
    this.options.locale = locale;
    this.recreateEditor(state);
  }

  static exportModelAsSvg(
    model: Apollon.UMLModel,
    options?: Apollon.ExportOptions,
    theme?: DeepPartial<Styles>,
  ): Apollon.SVG {
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

  selection: Apollon.Selection = { elements: [], relationships: [] };
  private currentModelState?: ModelState;
  private assessments: Apollon.Assessment[] = [];
  private application: RefObject<Application> = createRef();
  private selectionSubscribers: ((selection: Apollon.Selection) => void)[] = [];
  private assessmentSubscribers: ((assessments: Apollon.Assessment[]) => void)[] = [];
  private modelSubscribers: ((model: Apollon.UMLModel) => void)[] = [];
  private errorSubscribers: ((error: Error) => void)[] = [];

  constructor(private container: HTMLElement, private options: Apollon.ApollonOptions) {
    let state: DeepPartial<ModelState> | undefined = options.model ? ModelState.fromModel(options.model) : {};

    state = {
      ...state,
      diagram: new UMLDiagram({
        ...state.diagram,
        type: options.type,
      }),
      editor: {
        ...state.editor,
        view: ApollonView.Modelling,
        mode: options.mode || ApollonMode.Exporting,
        readonly: options.readonly || false,
        enablePopups: options.enablePopups === true || options.enablePopups === undefined,
        features: {
          hoverable: true,
          selectable: true,
          movable: !options.readonly,
          resizable: !options.readonly,
          connectable: !options.readonly,
          updatable: !options.readonly,
          droppable: !options.readonly,
        },
      },
    };

    const element = createElement(Application, {
      ref: this.application,
      state,
      styles: options.theme,
      locale: options.locale,
    });
    const errorBoundary = createElement(
      ErrorBoundary,
      // use key to force react to redraw
      { onError: this.onErrorOccurred.bind(this), key: uuid() },
      element,
    );
    render(errorBoundary, container, this.componentDidMount);
    try {
      this.currentModelState = this.store?.getState();
    } catch (error) {
      this.currentModelState = undefined;
    }
  }

  destroy() {
    unmountComponentAtNode(this.container);
  }

  select(selection: Apollon.Selection) {
    if (!this.store) return;
    const dispatch = this.store.dispatch as Dispatch;
    dispatch(UMLElementRepository.deselect());
    dispatch(UMLElementRepository.select([...selection.elements, ...selection.relationships]));
  }

  subscribeToSelectionChange(callback: (selection: Apollon.Selection) => void): number {
    return this.selectionSubscribers.push(callback) - 1;
  }

  unsubscribeFromSelectionChange(subscriptionId: number) {
    this.selectionSubscribers.splice(subscriptionId);
  }

  subscribeToAssessmentChange(callback: (assessments: Apollon.Assessment[]) => void): number {
    return this.assessmentSubscribers.push(callback) - 1;
  }

  unsubscribeFromAssessmentChange(subscriptionId: number) {
    this.assessmentSubscribers.splice(subscriptionId);
  }

  subscribeToModelChange(callback: (model: UMLModel) => void): number {
    return this.modelSubscribers.push(callback) - 1;
  }

  unsubscribeFromModelChange(subscriptionId: number) {
    this.modelSubscribers.splice(subscriptionId);
  }

  subscribeToApollonErrors(callback: (error: Error) => void): number {
    return this.errorSubscribers.push(callback) - 1;
  }

  unsubscribeToApollonErrors(subscriptionId: number) {
    this.errorSubscribers.splice(subscriptionId);
  }

  exportAsSVG(options?: Apollon.ExportOptions): Apollon.SVG {
    return ApollonEditor.exportModelAsSvg(this.model, options, this.options.theme);
  }

  private componentDidMount = () => {
    this.container.setAttribute('touch-action', 'none');

    setTimeout(() => {
      if (this.store) {
        this.store.subscribe(this.onDispatch);
      }
    });
  };

  /**
   * Triggered whenever an action is dispatched which potentially lead to a change in the store / state tree
   * Used to notify all the selection and assessment subscribers of Apollon
   */
  private onDispatch = () => {
    if (!this.store) return;
    const { elements, selected, assessments } = this.store.getState();
    const selection: Apollon.Selection = {
      elements: selected.filter((id) => elements[id].type in UMLElementType),
      relationships: selected.filter((id) => elements[id].type in UMLRelationshipType),
    };

    // check if previous selection differs from current selection, if yes -> notify subscribers
    if (JSON.stringify(this.selection) !== JSON.stringify(selection)) {
      this.selectionSubscribers.forEach((subscriber) => subscriber(selection));
      this.selection = selection;
    }

    const umlAssessments = Object.keys(assessments).map<Apollon.Assessment>((id) => ({
      modelElementId: id,
      elementType: elements[id].type as Apollon.UMLElementType | Apollon.UMLRelationshipType,
      score: assessments[id].score,
      feedback: assessments[id].feedback,
    }));

    // check if previous assessment differs from current selection, if yes -> notify subscribers
    if (JSON.stringify(this.assessments) !== JSON.stringify(umlAssessments)) {
      this.assessmentSubscribers.forEach((subscriber) => subscriber(umlAssessments));
      this.assessments = umlAssessments;
    }

    // notfiy that action was done
    this.notifyModelSubscribers();
  };

  private notifyModelSubscribers = debounce(() => {
    try {
      // if state not available -> do not emit changes
      if (!this.store) return;
      const model = this.model;
      const lastModel = this.currentModelState ? ModelState.toModel(this.currentModelState) : null;
      if ((!lastModel && model) || (lastModel && JSON.stringify(model) !== JSON.stringify(lastModel))) {
        this.modelSubscribers.forEach((subscriber) => subscriber(model));
        this.currentModelState = this.store.getState();
      } else {
        this.currentModelState = this.store.getState();
      }
    } catch (error) {
      // if error occured while getting current state for subscribers -> do not emit changes
      // -> no need to emit latest changes
    }
  }, 50);

  private recreateEditor(state: DeepPartial<ModelState>) {
    this.destroy();

    const element = createElement(Application, {
      ref: this.application,
      state,
      styles: this.options.theme,
      locale: this.options.locale,
    });
    const errorBoundary = createElement(
      ErrorBoundary,
      // use key to force react to redraw
      { onError: this.onErrorOccurred.bind(this), key: uuid() },
      element,
    );
    render(errorBoundary, this.container, this.componentDidMount);
  }

  private onErrorOccurred(error: Error) {
    this.errorSubscribers.forEach((subscriber) => subscriber(error));
    this.restoreEditor();
  }

  private restoreEditor() {
    if (this.currentModelState) {
      const state = {
        ...this.currentModelState,
        hovered: [],
        selected: [],
        moving: [],
        resizing: [],
        connecting: [],
        reconnecting: {},
        updating: [],
      };
      this.recreateEditor(state);
    }
  }

  private get store(): Store<ModelState, Actions> | null {
    return (
      this.application.current &&
      this.application.current.store.current &&
      this.application.current.store.current.state.store
    );
  }
}
