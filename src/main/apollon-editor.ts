import 'pepjs';
import { createElement, createRef, RefObject } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { DeepPartial, Store } from 'redux';
import { ModelState, PartialModelState } from './components/store/model-state';
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
import { delay } from './utils/delay';
import { ErrorBoundary } from './components/controls/error-boundary/ErrorBoundary';
import { replaceColorVariables } from './utils/replace-color-variables';

export class ApollonEditor {
  /**
   * Returns the current model of the Apollon Editor
   */
  get model(): Apollon.UMLModel {
    if (!this.store) {
      // tslint:disable-next-line:no-console
      console.error('The application state of Apollon could not be retrieved. The editor may already be destroyed.');
      throw new Error('The application state of Apollon could not be retrieved. The editor may already be destroyed.');
    }
    return ModelState.toModel(this.store.getState());
  }

  /**
   * Sets a model as the current model of the Apollon Editor
   * @param model valid Apollon Editor Model
   */
  set model(model: Apollon.UMLModel) {
    if (!this.store) {
      // tslint:disable-next-line:no-console
      console.error('The application state of Apollon could not be retrieved. The editor may already be destroyed.');
      throw new Error('The application state of Apollon could not be retrieved. The editor may already be destroyed.');
    }
    const state: PartialModelState = {
      ...ModelState.fromModel(model),
      editor: { ...this.store.getState().editor },
    };
    this.recreateEditor(state);
  }

  /**
   * Sets the diagram type of the current Apollon Editor. This changes the selection of elements the user can chose from on the sidebar.
   * @param diagramType the new diagram type
   */
  set type(diagramType: UMLDiagramType) {
    if (!this.store) {
      // tslint:disable-next-line:no-console
      console.error('The application state of Apollon could not be retrieved. The editor may already be destroyed.');
      throw new Error('The application state of Apollon could not be retrieved. The editor may already be destroyed.');
    }
    const state: PartialModelState = {
      ...this.store.getState(),
      diagram: new UMLDiagram({
        type: diagramType,
      }),
      elements: undefined,
    };
    this.recreateEditor(state);
  }

  /**
   * Sets the current locale of the Apollon Editor.
   * @param locale supported locale
   */
  set locale(locale: Locale) {
    if (!this.store) {
      // tslint:disable-next-line:no-console
      console.error('The application state of Apollon could not be retrieved. The editor may already be destroyed.');
      throw new Error('The application state of Apollon could not be retrieved. The editor may already be destroyed.');
    }
    const state = this.store.getState();
    this.options.locale = locale;
    this.recreateEditor(state);
  }

  /**
   * renders a model as a svg and returns it. Therefore the svg is temporarily added to the dom and removed after it has been rendered.
   * @param model the apollon model to export as a svg
   * @param options options to change the export behavior (add margin, exclude element ...)
   * @param theme the theme which should be applied on the svg
   */
  static async exportModelAsSvg(
    model: Apollon.UMLModel,
    options?: Apollon.ExportOptions,
    theme?: DeepPartial<Styles>,
  ): Promise<Apollon.SVG> {
    const container = document.createElement('div');
    const root = createRoot(container);
    const element = createElement(Svg, { model, options, styles: theme });
    const svg = new Svg({ model, options, styles: theme });
    root.render(element);
    await delay(0);

    return {
      svg: replaceColorVariables(container.querySelector('svg')!.outerHTML),
      clip: svg.state.bounds,
    };
  }

  selection: Apollon.Selection = { elements: [], relationships: [] };
  private root?: Root;
  private currentModelState?: ModelState;
  private assessments: Apollon.Assessment[] = [];
  private application: Application | null = null;
  private selectionSubscribers: { [key: number]: (selection: Apollon.Selection) => void } = {};
  private assessmentSubscribers: { [key: number]: (assessments: Apollon.Assessment[]) => void } = {};
  private modelSubscribers: { [key: number]: (model: Apollon.UMLModel) => void } = {};
  private discreteModelSubscribers: { [key: number]: (model: Apollon.UMLModel) => void } = {};
  private errorSubscribers: { [key: number]: (error: Error) => void } = {};
  private initializedPromise: Promise<void>;

  constructor(private container: HTMLElement, private options: Apollon.ApollonOptions) {
    let state: PartialModelState | undefined = options.model ? ModelState.fromModel(options.model) : {};

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
        colorEnabled: options.colorEnabled || false,
        scale: options.scale || 1.0,
        readonly: options.readonly || false,
        enablePopups: options.enablePopups === true || options.enablePopups === undefined,
        enableCopyPasteToClipboard: options.copyPasteToClipboard === true,
        features: {
          hoverable: true,
          selectable: true,
          movable: !options.readonly,
          resizable: !options.readonly,
          connectable: !options.readonly,
          updatable: !options.readonly,
          droppable: !options.readonly,
          alternativePortVisualization: false,
        },
      },
    };

    let initializedResolve: () => void;
    this.initializedPromise = new Promise((resolve) => {
      initializedResolve = resolve;
    });

    const element = createElement(Application, {
      ref: async (app) => {
        this.application ??= app;
        await app?.initialized;
        initializedResolve();
      },
      state,
      styles: options.theme,
      locale: options.locale
    });
    const errorBoundary = createElement(ErrorBoundary, { onError: this.onErrorOccurred.bind(this) }, element);
    this.root = createRoot(container);
    this.root.render(errorBoundary);
    try {
      this.currentModelState = this.store?.getState();
    } catch (error) {
      this.currentModelState = undefined;
    }
    this.componentDidMount();
  }

  /**
   * Destroys the Apollon Editor and unmounts it from its container
   */
  destroy() {
    this.root?.unmount();
  }

  /**
   * Selects the by their id identified UMLElements and UMLRelationships
   * @param selection contains ids of the elements and relationships which should be selected
   */
  select(selection: Apollon.Selection) {
    if (!this.store) return;
    const dispatch = this.store.dispatch as Dispatch;
    dispatch(UMLElementRepository.deselect());
    dispatch(UMLElementRepository.select([...selection.elements, ...selection.relationships]));
  }

  _getNewSubscriptionId(subscribers: { [key: number]: any }): number {
    // largest key + 1
    if (Object.keys(subscribers).length === 0) return 0;
    return Math.max(...Object.keys(subscribers).map((key) => parseInt(key))) + 1;
  }

  /**
   * Register callback which is executed when the selection of elements and relationships changes
   * @param callback function which is called when selection changes
   * @return returns the subscription identifier which can be used to unsubscribe
   */
  subscribeToSelectionChange(callback: (selection: Apollon.Selection) => void): number {
    const id = this._getNewSubscriptionId(this.selectionSubscribers);
    this.selectionSubscribers[id] = callback;
    return id;
  }

  /**
   * Remove selection subscription, so that the corresponding callback is no longer executed when the selection of elements is changed.
   * @param subscriptionId subscription identifier
   */
  unsubscribeFromSelectionChange(subscriptionId: number) {
    delete this.selectionSubscribers[subscriptionId];
  }

  /**
   * Register callback which is executed when the assessment of elements and relationships are changed
   * @param callback function which is called when assessment changes
   * @return returns the subscription identifier which can be used to unsubscribe
   */
  subscribeToAssessmentChange(callback: (assessments: Apollon.Assessment[]) => void): number {
    const id = this._getNewSubscriptionId(this.assessmentSubscribers);
    this.assessmentSubscribers[id] = callback;
    return id;
  }

  /**
   * Remove assessment subscription, so that the corresponding callback is no longer executed when the assessment of elements are changed.
   * @param subscriptionId subscription identifier
   */
  unsubscribeFromAssessmentChange(subscriptionId: number) {
    delete this.assessmentSubscribers[subscriptionId];
  }

  /**
   * Register callback which is executed when the model changes
   * @param callback function which is called when the model changes
   * @return returns the subscription identifier which can be used to unsubscribe
   */
  subscribeToModelChange(callback: (model: UMLModel) => void): number {
    const id = this._getNewSubscriptionId(this.modelSubscribers);
    this.modelSubscribers[id] = callback;
    return id;
  }

  /**
   * Remove assessment subscription, so that the corresponding callback is no longer executed when the assessment of elements are changed.
   * @param subscriptionId subscription identifier
   */
  unsubscribeFromModelChange(subscriptionId: number) {
    delete this.modelSubscribers[subscriptionId];
  }

  /**
   * Register callback which is executed at the end of each user action and ignores the changes during a user action
   * For example: moving of an element is ignored until user releases the element
   * @param callback function which is called when the model changes
   * @return returns the subscription identifier which can be used to unsubscribe
   */
  subscribeToModelDiscreteChange(callback: (model: UMLModel) => void): number {
    const id = this._getNewSubscriptionId(this.discreteModelSubscribers);
    this.discreteModelSubscribers[id] = callback;
    return id;
  }

  /**
   * Remove model change subscription, so that the corresponding callback is no longer executed when the model is changed.
   * @param subscriptionId subscription identifier
   */
  unsubscribeFromDiscreteModelChange(subscriptionId: number) {
    delete this.discreteModelSubscribers[subscriptionId];
  }

  /**
   * Register callback which is executed when an error occurs in the editor. Apollon will try to recreate the latest working state when an error occurs, so that it is less visible to user / less interrupting.
   * A registered callback would be called anyway, giving the full error, so that the application which uses Apollon can decide what to do next.
   * @param callback callback function which is called when an error occurs
   * @return returns the subscription identifier which can be used to unsubscribe
   */
  subscribeToApollonErrors(callback: (error: Error) => void): number {
    const id = this._getNewSubscriptionId(this.errorSubscribers);
    this.errorSubscribers[id] = callback;
    return id;
  }

  /**
   * Removes error subscription, so that the corresponding callback is no longer executed when an error occurs.
   * @param subscriptionId subscription identifier
   */
  unsubscribeToApollonErrors(subscriptionId: number) {
    delete this.errorSubscribers[subscriptionId];
  }

  /**
   * exports current model as svg
   * @param options options to change the export behavior (add margin, exclude element ...)
   */
  exportAsSVG(options?: Apollon.ExportOptions): Promise<Apollon.SVG> {
    return ApollonEditor.exportModelAsSvg(this.model, options, this.options.theme);
  }

  /**
   * Returns current scale factor of the application
   */
  getScaleFactor(): number {
    return this.options.scale || 1;
  }

  private componentDidMount = () => {
    this.container.setAttribute('touch-action', 'none');

    setTimeout(() => {
      if (this.store) {
        this.store.subscribe(this.onDispatch);
      } else {
        setTimeout(this.componentDidMount, 100);
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
      Object.values(this.selectionSubscribers).forEach((subscriber) => subscriber(selection));
      this.selection = selection;
    }

    const umlAssessments = Object.keys(assessments).map<Apollon.Assessment>((id) => ({
      modelElementId: id,
      elementType: elements[id].type as Apollon.UMLElementType | Apollon.UMLRelationshipType,
      score: assessments[id].score,
      feedback: assessments[id].feedback,
      dropInfo: assessments[id].dropInfo,
    }));

    // check if previous assessment differs from current selection, if yes -> notify subscribers
    if (JSON.stringify(this.assessments) !== JSON.stringify(umlAssessments)) {
      Object.values(this.assessmentSubscribers).forEach((subscriber) => subscriber(umlAssessments));
      this.assessments = umlAssessments;
    }

    // notfiy that action was done
    this.notifyModelSubscribers();
    this.notifyDiscreteModelSubscribers();
  };

  /**
   * Triggered whenever an action is dispatched which potentially lead to a change in the store / state tree
   * Used to notify all the selection and assessment subscribers of Apollon if the action ends with END or DELETE
   */
  private notifyDiscreteModelSubscribers = () => {
    try {
      // if state not available -> do not emit changes
      if (!this.store) return;
      const model = this.model;
      if (
        // At the end of each update operation there is an action that ends with END except DELETE
        // Function is called with every redux action but only notifies subscribers if the action ends with given words
        this.store.getState().lastAction.endsWith('END') ||
        this.store.getState().lastAction.endsWith('DELETE')
      ) {
        const lastModel = ModelState.toModel(this.store.getState());
        Object.values(this.discreteModelSubscribers).forEach((subscriber) => subscriber(lastModel));
      }
    } catch (error) {
      // if error occured while getting current state for subscribers -> do not emit changes
      // -> no need to emit latest changes
    }
  };

  private notifyModelSubscribers = debounce(() => {
    try {
      // if state not available -> do not emit changes
      if (!this.store) return;
      const model = this.model;
      const lastModel = this.currentModelState ? ModelState.toModel(this.currentModelState) : null;
      if ((!lastModel && model) || (lastModel && JSON.stringify(model) !== JSON.stringify(lastModel))) {
        Object.values(this.modelSubscribers).forEach((subscriber) => subscriber(model));
        this.currentModelState = this.store.getState();
      } else {
        this.currentModelState = this.store.getState();
      }
    } catch (error) {
      // if error occured while getting current state for subscribers -> do not emit changes
      // -> no need to emit latest changes
    }
  }, 50);

  private recreateEditor(state: PartialModelState) {
    this.destroy();

    const element = createElement(Application, {
      ref: (app) => {
        this.application = app;
      },
      state,
      styles: this.options.theme,
      locale: this.options.locale,
    });
    const errorBoundary = createElement(ErrorBoundary, { onError: this.onErrorOccurred.bind(this) }, element);
    this.root = createRoot(this.container);
    this.root.render(errorBoundary);
    this.componentDidMount();
  }

  private onErrorOccurred(error: Error) {
    Object.values(this.errorSubscribers).forEach((subscriber) => subscriber(error));
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

  private get store(): Store<ModelState, Actions> | undefined {
    return this.application?.store?.current?.state.store;
  }

  /**
   * Promise that resolves when the application is initialized
   * => this.store is be available and there should be no errors when trying to access some methods like this.model
   */
  get initialized(): Promise<void> {
    return this.initializedPromise;
  }
}
